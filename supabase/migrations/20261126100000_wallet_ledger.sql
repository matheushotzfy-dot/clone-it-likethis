-- =============================================================================
-- Carteira com ledger imutável
--
-- Regra central: profiles.balance só muda dentro de public.wallet_apply().
-- Cada mudança gera exatamente uma linha em wallet_ledger com chave de
-- idempotência única, então callbacks repetidos, cliques duplos e corridas
-- entre webhook e polling nunca aplicam o mesmo valor duas vezes.
--
-- Escrita idempotente: pode rodar de novo sem efeito colateral.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tipos e tabelas
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.ledger_kind as enum (
    'opening',            -- saldo existente antes do ledger
    'deposit',            -- depósito aprovado
    'withdrawal_hold',    -- saque solicitado: valor sai do saldo e fica reservado
    'withdrawal_release', -- saque recusado/cancelado: valor volta
    'casino_bet',
    'casino_win',
    'casino_refund',
    'sports_stake',
    'sports_payout',
    'sports_refund',
    'adjustment'          -- ajuste manual do admin (sempre com motivo)
  );
exception when duplicate_object then null; end $$;

create table if not exists public.wallet_ledger (
  id              bigint generated always as identity primary key,
  user_id         uuid not null references public.profiles(id) on delete restrict,
  kind            public.ledger_kind not null,
  amount          numeric(14,2) not null check (amount <> 0),
  balance_before  numeric(14,2) not null,
  balance_after   numeric(14,2) not null check (balance_after >= 0),
  idempotency_key text not null unique,
  ref_table       text,
  ref_id          text,
  description     text,
  meta            jsonb not null default '{}'::jsonb,
  created_by      uuid,
  created_at      timestamptz not null default now(),
  constraint wallet_ledger_math check (balance_after = balance_before + amount)
);
create index if not exists idx_wallet_ledger_user on public.wallet_ledger (user_id, id desc);
create index if not exists idx_wallet_ledger_kind on public.wallet_ledger (kind, created_at desc);
create index if not exists idx_wallet_ledger_ref on public.wallet_ledger (ref_table, ref_id);

alter table public.wallet_ledger enable row level security;
drop policy if exists "ledger own read" on public.wallet_ledger;
create policy "ledger own read" on public.wallet_ledger
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "ledger admin read" on public.wallet_ledger;
create policy "ledger admin read" on public.wallet_ledger
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create table if not exists public.admin_audit_log (
  id          bigint generated always as identity primary key,
  admin_id    uuid,
  action      text not null,
  target_user uuid,
  target_id   text,
  details     jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists idx_admin_audit_created on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_target on public.admin_audit_log (target_user, created_at desc);
alter table public.admin_audit_log enable row level security;
drop policy if exists "audit admin read" on public.admin_audit_log;
create policy "audit admin read" on public.admin_audit_log
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create table if not exists public.pf_callback_log (
  id          bigint generated always as identity primary key,
  kind        text not null,              -- BALANCE | WinBet | Refund | unknown
  user_id     uuid,
  txn_id      text,
  http_status int not null,
  result      text not null,              -- ok | duplicate | insufficient | ...
  balance     numeric(14,2),
  provider_balance numeric(14,2),         -- user_balance que a PlayFivers informou
  payload     jsonb,                      -- sem agent_code/agent_secret
  created_at  timestamptz not null default now()
);
create index if not exists idx_pf_log_created on public.pf_callback_log (created_at desc);
create index if not exists idx_pf_log_user on public.pf_callback_log (user_id, created_at desc);
alter table public.pf_callback_log enable row level security;
drop policy if exists "pf log admin read" on public.pf_callback_log;
create policy "pf log admin read" on public.pf_callback_log
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

alter table public.game_rounds add column if not exists status text not null default 'settled';
alter table public.game_rounds add column if not exists refunded_at timestamptz;
do $$ begin
  alter table public.game_rounds add constraint game_rounds_status_chk check (status in ('settled','refunded'));
exception when duplicate_object then null; end $$;
create index if not exists idx_game_rounds_created on public.game_rounds (created_at desc);
create index if not exists idx_game_rounds_game on public.game_rounds (provider, game_code, created_at desc);

create table if not exists public.sports_bets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete restrict,
  event_id         text not null,
  league           text not null,
  league_name      text,
  home             text not null,
  away             text not null,
  starts_at        timestamptz,
  pick             text not null check (pick in ('home','draw','away')),
  odd              numeric(8,2) not null check (odd >= 1.01 and odd <= 1000),
  stake            numeric(14,2) not null check (stake > 0),
  potential_payout numeric(14,2) not null,
  status           text not null default 'open' check (status in ('open','won','lost','void')),
  score_home       int,
  score_away       int,
  settled_at       timestamptz,
  settled_by       uuid,             -- null = liquidação automática
  settle_note      text,
  created_at       timestamptz not null default now()
);
create index if not exists idx_sports_bets_user on public.sports_bets (user_id, created_at desc);
create index if not exists idx_sports_bets_open on public.sports_bets (status, league, event_id) where status = 'open';
alter table public.sports_bets enable row level security;
drop policy if exists "sports bets own read" on public.sports_bets;
create policy "sports bets own read" on public.sports_bets
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists "sports bets admin read" on public.sports_bets;
create policy "sports bets admin read" on public.sports_bets
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- ---------------------------------------------------------------------------
-- 2. Núcleo: wallet_apply
-- ---------------------------------------------------------------------------
create or replace function public.wallet_apply(
  p_user        uuid,
  p_amount      numeric,
  p_kind        public.ledger_kind,
  p_key         text,
  p_ref_table   text default null,
  p_ref_id      text default null,
  p_description text default null,
  p_meta        jsonb default '{}'::jsonb,
  p_created_by  uuid default null
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_amount numeric(14,2) := round(p_amount, 2);
  v_before numeric(14,2);
  v_after  numeric(14,2);
begin
  if v_amount is null or v_amount = 0 then
    raise exception 'WALLET_ZERO_AMOUNT';
  end if;
  if p_key is null or length(p_key) < 3 then
    raise exception 'WALLET_KEY_REQUIRED';
  end if;

  select balance into v_before from public.profiles where id = p_user for update;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  -- Checado depois do lock: uma chamada concorrente com a mesma chave
  -- espera o lock acima e aqui vê a linha já gravada.
  if exists (select 1 from public.wallet_ledger where idempotency_key = p_key) then
    return v_before;
  end if;

  v_after := v_before + v_amount;
  if v_after < 0 then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  perform set_config('app.wallet_write', 'on', true);
  update public.profiles set balance = v_after, updated_at = now() where id = p_user;
  perform set_config('app.wallet_write', 'off', true);

  insert into public.wallet_ledger (
    user_id, kind, amount, balance_before, balance_after, idempotency_key,
    ref_table, ref_id, description, meta, created_by
  ) values (
    p_user, p_kind, v_amount, v_before, v_after, p_key,
    p_ref_table, p_ref_id, p_description, coalesce(p_meta, '{}'::jsonb), p_created_by
  );
  return v_after;
end $$;

-- Saldo nunca muda por UPDATE direto — nem do admin, nem da service role.
create or replace function public.guard_profile_balance()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if TG_OP = 'INSERT' then
    if coalesce(NEW.balance, 0) <> 0 or coalesce(NEW.bonus_balance, 0) <> 0 then
      raise exception 'BALANCE_DIRECT_WRITE_FORBIDDEN';
    end if;
    return NEW;
  end if;
  if (NEW.balance is distinct from OLD.balance or NEW.bonus_balance is distinct from OLD.bonus_balance)
     and coalesce(current_setting('app.wallet_write', true), 'off') <> 'on' then
    raise exception 'BALANCE_DIRECT_WRITE_FORBIDDEN';
  end if;
  return NEW;
end $$;

-- Ledger é append-only.
create or replace function public.guard_ledger_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'LEDGER_IMMUTABLE';
end $$;

drop trigger if exists trg_wallet_ledger_immutable on public.wallet_ledger;
create trigger trg_wallet_ledger_immutable
  before update or delete on public.wallet_ledger
  for each row execute function public.guard_ledger_immutable();

-- ---------------------------------------------------------------------------
-- 3. Saldos existentes viram linha de abertura (antes de ligar a trava)
-- ---------------------------------------------------------------------------
-- O bônus antigo foi descontinuado; zera o campo legado.
update public.profiles set bonus_balance = 0 where bonus_balance <> 0;

insert into public.wallet_ledger (user_id, kind, amount, balance_before, balance_after, idempotency_key, description)
select p.id, 'opening', p.balance, 0, p.balance, 'opening:' || p.id, 'Saldo existente na criação do ledger'
from public.profiles p
where p.balance <> 0
  and not exists (select 1 from public.wallet_ledger l where l.user_id = p.id);

drop trigger if exists trg_guard_profile_balance on public.profiles;
create trigger trg_guard_profile_balance
  before insert or update on public.profiles
  for each row execute function public.guard_profile_balance();

-- ---------------------------------------------------------------------------
-- 4. Depósitos e saques (tabela transactions)
-- ---------------------------------------------------------------------------
-- deposit:    credita só quando passa para approved.
-- withdrawal: reserva o valor na criação (sai do saldo na hora, então não dá
--             pra pedir saque e continuar jogando o mesmo dinheiro), devolve
--             se for recusado/cancelado, e não mexe no saldo ao aprovar.
create or replace function public.apply_transaction_balance()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_final text[] := array['rejected','cancelled','failed'];
begin
  if NEW.type = 'deposit' then
    if NEW.status = 'approved' and (TG_OP = 'INSERT' or OLD.status <> 'approved') then
      perform public.wallet_apply(NEW.user_id, NEW.amount, 'deposit', 'tx:' || NEW.id || ':deposit',
        'transactions', NEW.id::text, coalesce(NEW.description, 'Depósito'));
    end if;
  elsif NEW.type = 'withdrawal' then
    if TG_OP = 'INSERT' then
      if NEW.status not in ('pending','approved') then
        return NEW;
      end if;
      perform public.wallet_apply(NEW.user_id, -NEW.amount, 'withdrawal_hold', 'tx:' || NEW.id || ':hold',
        'transactions', NEW.id::text, coalesce(NEW.description, 'Saque'));
    elsif NEW.status::text = any (v_final) and OLD.status::text <> all (v_final) then
      perform public.wallet_apply(NEW.user_id, NEW.amount, 'withdrawal_release', 'tx:' || NEW.id || ':release',
        'transactions', NEW.id::text, 'Saque devolvido: ' || coalesce(NEW.description, ''));
    end if;
  end if;
  return NEW;
end $$;

-- Transação finalizada não volta; valor, tipo e dono nunca mudam.
create or replace function public.guard_transaction_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.user_id is distinct from OLD.user_id
     or NEW.type is distinct from OLD.type
     or NEW.amount is distinct from OLD.amount then
    raise exception 'TRANSACTION_IMMUTABLE_FIELDS';
  end if;
  if OLD.status::text in ('approved','rejected','cancelled','failed','completed')
     and NEW.status is distinct from OLD.status then
    raise exception 'TRANSACTION_ALREADY_FINAL';
  end if;
  return NEW;
end $$;

drop trigger if exists trg_guard_transaction_update on public.transactions;
create trigger trg_guard_transaction_update
  before update on public.transactions
  for each row execute function public.guard_transaction_update();

-- Só pode apagar transação que nunca mexeu em saldo.
create or replace function public.guard_transaction_delete()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.wallet_ledger where ref_table = 'transactions' and ref_id = OLD.id::text) then
    raise exception 'TRANSACTION_HAS_LEDGER';
  end if;
  return OLD;
end $$;

drop trigger if exists trg_guard_transaction_delete on public.transactions;
create trigger trg_guard_transaction_delete
  before delete on public.transactions
  for each row execute function public.guard_transaction_delete();

-- Usuário não grava em transactions direto; tudo passa pelo servidor.
drop policy if exists "Users create own transactions" on public.transactions;
drop policy if exists "Admins delete transactions" on public.transactions;

-- ---------------------------------------------------------------------------
-- 5. Cassino (PlayFivers)
-- ---------------------------------------------------------------------------
-- A aposta tem que caber no saldo antes do ganho entrar (checar só o líquido
-- deixaria apostar sem saldo quando aposta e ganho chegam juntos).
create or replace function public.apply_playfivers_transaction(
  p_user_id uuid, p_txn_id text, p_round_id text, p_provider text, p_game_code text,
  p_game_type text, p_txn_type text, p_bet numeric, p_win numeric, p_payload jsonb
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_bet    numeric(14,2) := round(coalesce(p_bet, 0), 2);
  v_win    numeric(14,2) := round(coalesce(p_win, 0), 2);
  v_before numeric(14,2);
  v_after  numeric(14,2);
  v_frozen boolean;
begin
  if v_bet < 0 or v_win < 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  select balance, coalesce(is_frozen, false) into v_before, v_frozen
    from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  if exists (select 1 from public.game_rounds where txn_id = p_txn_id) then
    return v_before;
  end if;

  if v_bet > 0 and v_frozen then
    raise exception 'USER_FROZEN';
  end if;
  if v_bet > v_before then
    raise exception 'INSUFFICIENT_BALANCE';
  end if;

  v_after := v_before;
  if v_bet > 0 then
    v_after := public.wallet_apply(p_user_id, -v_bet, 'casino_bet', 'pf:' || p_txn_id || ':bet',
      'game_rounds', p_txn_id, 'Aposta ' || coalesce(p_provider, '') || ' / ' || coalesce(p_game_code, ''),
      jsonb_build_object('round_id', p_round_id, 'provider', p_provider, 'game_code', p_game_code));
  end if;
  if v_win > 0 then
    v_after := public.wallet_apply(p_user_id, v_win, 'casino_win', 'pf:' || p_txn_id || ':win',
      'game_rounds', p_txn_id, 'Ganho ' || coalesce(p_provider, '') || ' / ' || coalesce(p_game_code, ''),
      jsonb_build_object('round_id', p_round_id, 'provider', p_provider, 'game_code', p_game_code));
  end if;

  insert into public.game_rounds (
    user_id, txn_id, round_id, provider, game_code, game_type, txn_type,
    bet, win, before_balance, after_balance, payload, status
  ) values (
    p_user_id, p_txn_id, p_round_id, p_provider, p_game_code, p_game_type, p_txn_type,
    v_bet, v_win, v_before, v_after, p_payload, 'settled'
  );
  return v_after;
end $$;

-- Refund: estorna a rodada original identificada pelo txn_id.
-- Retorna (balance, result) onde result = refunded | already_refunded | not_found | insufficient
create or replace function public.apply_playfivers_refund(
  p_user_id uuid, p_txn_id text, p_payload jsonb
) returns table (balance numeric, result text)
language plpgsql security definer set search_path = public as $$
declare
  v_round  public.game_rounds%rowtype;
  v_bal    numeric(14,2);
  v_net    numeric(14,2);
begin
  select p.balance into v_bal from public.profiles p where p.id = p_user_id for update;
  if not found then
    raise exception 'USER_NOT_FOUND';
  end if;

  select * into v_round from public.game_rounds r where r.txn_id = p_txn_id and r.user_id = p_user_id;
  if not found then
    return query select v_bal, 'not_found'::text;
    return;
  end if;
  if v_round.status = 'refunded' then
    return query select v_bal, 'already_refunded'::text;
    return;
  end if;

  v_net := v_round.bet - v_round.win;
  if v_net <> 0 then
    begin
      v_bal := public.wallet_apply(p_user_id, v_net, 'casino_refund', 'pf:' || p_txn_id || ':refund',
        'game_rounds', p_txn_id, 'Estorno ' || coalesce(v_round.provider, '') || ' / ' || coalesce(v_round.game_code, ''),
        coalesce(p_payload, '{}'::jsonb));
    exception when others then
      if sqlerrm like '%INSUFFICIENT_BALANCE%' then
        return query select v_bal, 'insufficient'::text;
        return;
      end if;
      raise;
    end;
  end if;

  update public.game_rounds gr set status = 'refunded', refunded_at = now() where gr.id = v_round.id;
  return query select v_bal, 'refunded'::text;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Esportes
-- ---------------------------------------------------------------------------
drop function if exists public.place_sports_bet(uuid, numeric, numeric, text, text, text);

create or replace function public.place_sports_bet(
  p_user_id uuid, p_event_id text, p_league text, p_league_name text,
  p_home text, p_away text, p_starts_at timestamptz,
  p_pick text, p_odd numeric, p_stake numeric
) returns table (bet_id uuid, balance numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_id     uuid := gen_random_uuid();
  v_frozen boolean;
  v_bal    numeric(14,2);
  v_stake  numeric(14,2) := round(p_stake, 2);
  v_odd    numeric(8,2)  := round(p_odd, 2);
begin
  if v_stake is null or v_stake <= 0 then raise exception 'INVALID_STAKE'; end if;
  if v_odd is null or v_odd < 1.01 then raise exception 'INVALID_ODD'; end if;

  select coalesce(pr.is_frozen, false) into v_frozen from public.profiles pr where pr.id = p_user_id;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  if v_frozen then raise exception 'USER_FROZEN'; end if;

  insert into public.sports_bets (id, user_id, event_id, league, league_name, home, away, starts_at,
    pick, odd, stake, potential_payout)
  values (v_id, p_user_id, p_event_id, p_league, p_league_name, p_home, p_away, p_starts_at,
    p_pick, v_odd, v_stake, round(v_stake * v_odd, 2));

  v_bal := public.wallet_apply(p_user_id, -v_stake, 'sports_stake', 'sb:' || v_id || ':stake',
    'sports_bets', v_id::text, p_home || ' x ' || p_away);

  return query select v_id, v_bal;
end $$;

-- p_status: won | lost | void
create or replace function public.settle_sports_bet(
  p_bet_id uuid, p_status text, p_score_home int, p_score_away int,
  p_settled_by uuid default null, p_note text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_bet public.sports_bets%rowtype;
begin
  if p_status not in ('won','lost','void') then raise exception 'INVALID_STATUS'; end if;

  select * into v_bet from public.sports_bets where id = p_bet_id for update;
  if not found then raise exception 'BET_NOT_FOUND'; end if;
  if v_bet.status <> 'open' then return 'already_settled'; end if;

  if p_status = 'won' then
    perform public.wallet_apply(v_bet.user_id, v_bet.potential_payout, 'sports_payout', 'sb:' || v_bet.id || ':payout',
      'sports_bets', v_bet.id::text, 'Prêmio ' || v_bet.home || ' x ' || v_bet.away, '{}'::jsonb, p_settled_by);
  elsif p_status = 'void' then
    perform public.wallet_apply(v_bet.user_id, v_bet.stake, 'sports_refund', 'sb:' || v_bet.id || ':refund',
      'sports_bets', v_bet.id::text, 'Aposta anulada ' || v_bet.home || ' x ' || v_bet.away, '{}'::jsonb, p_settled_by);
  end if;

  update public.sports_bets
     set status = p_status, score_home = p_score_home, score_away = p_score_away,
         settled_at = now(), settled_by = p_settled_by, settle_note = p_note
   where id = v_bet.id;

  if p_settled_by is not null then
    insert into public.admin_audit_log (admin_id, action, target_user, target_id, details)
    values (p_settled_by, 'sports_bet.settle', v_bet.user_id, v_bet.id::text,
      jsonb_build_object('status', p_status, 'score', p_score_home || '-' || p_score_away, 'note', p_note));
  end if;
  return p_status;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Admin
-- ---------------------------------------------------------------------------
-- Chamada pelo cliente autenticado do admin: auth.uid() não pode ser forjado.
create or replace function public.admin_adjust_balance(
  p_user_id uuid, p_delta numeric, p_reason text, p_request_id text
) returns numeric
language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := auth.uid();
  v_bal   numeric;
begin
  if v_admin is null or not public.has_role(v_admin, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  if p_reason is null or length(trim(p_reason)) < 3 then
    raise exception 'REASON_REQUIRED';
  end if;
  if p_request_id is null or length(p_request_id) < 8 then
    raise exception 'REQUEST_ID_REQUIRED';
  end if;

  v_bal := public.wallet_apply(p_user_id, p_delta, 'adjustment', 'adj:' || p_request_id,
    null, null, 'Ajuste manual: ' || trim(p_reason), '{}'::jsonb, v_admin);

  insert into public.admin_audit_log (admin_id, action, target_user, details)
  values (v_admin, 'wallet.adjust', p_user_id,
    jsonb_build_object('delta', round(p_delta, 2), 'reason', trim(p_reason), 'balance_after', v_bal, 'request_id', p_request_id));
  return v_bal;
end $$;

create or replace function public.admin_log(
  p_action text, p_target_user uuid default null, p_target_id text default null, p_details jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := auth.uid();
begin
  if v_admin is null or not public.has_role(v_admin, 'admin') then
    raise exception 'FORBIDDEN';
  end if;
  insert into public.admin_audit_log (admin_id, action, target_user, target_id, details)
  values (v_admin, p_action, p_target_user, p_target_id, coalesce(p_details, '{}'::jsonb));
end $$;

-- Saldo de cada jogador comparado com a soma do ledger. diff precisa ser 0.
create or replace view public.admin_wallet_reconciliation
with (security_invoker = true) as
select p.id as user_id,
       p.username,
       p.balance,
       coalesce(l.total, 0)::numeric(14,2) as ledger_total,
       (p.balance - coalesce(l.total, 0))::numeric(14,2) as diff,
       l.entries,
       l.last_at
from public.profiles p
left join lateral (
  select sum(amount) as total, count(*) as entries, max(created_at) as last_at
  from public.wallet_ledger w where w.user_id = p.id
) l on true;

-- ---------------------------------------------------------------------------
-- 8. Permissões
-- ---------------------------------------------------------------------------
revoke all on function public.wallet_apply(uuid, numeric, public.ledger_kind, text, text, text, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.apply_playfivers_transaction(uuid, text, text, text, text, text, text, numeric, numeric, jsonb) from public, anon, authenticated;
revoke all on function public.apply_playfivers_refund(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.place_sports_bet(uuid, text, text, text, text, text, timestamptz, text, numeric, numeric) from public, anon, authenticated;
revoke all on function public.settle_sports_bet(uuid, text, int, int, uuid, text) from public, anon, authenticated;
revoke all on function public.guard_profile_balance() from public, anon, authenticated;
revoke all on function public.guard_ledger_immutable() from public, anon, authenticated;
revoke all on function public.guard_transaction_update() from public, anon, authenticated;
revoke all on function public.guard_transaction_delete() from public, anon, authenticated;
revoke all on function public.apply_transaction_balance() from public, anon, authenticated;
revoke all on function public.guard_real_money() from public, anon, authenticated;

grant execute on function public.wallet_apply(uuid, numeric, public.ledger_kind, text, text, text, text, jsonb, uuid) to service_role;
grant execute on function public.apply_playfivers_transaction(uuid, text, text, text, text, text, text, numeric, numeric, jsonb) to service_role;
grant execute on function public.apply_playfivers_refund(uuid, text, jsonb) to service_role;
grant execute on function public.place_sports_bet(uuid, text, text, text, text, text, timestamptz, text, numeric, numeric) to service_role;
grant execute on function public.settle_sports_bet(uuid, text, int, int, uuid, text) to service_role;

revoke all on function public.admin_adjust_balance(uuid, numeric, text, text) from public, anon;
grant execute on function public.admin_adjust_balance(uuid, numeric, text, text) to authenticated;
revoke all on function public.admin_log(text, uuid, text, jsonb) from public, anon;
grant execute on function public.admin_log(text, uuid, text, jsonb) to authenticated;

revoke all on public.wallet_ledger, public.admin_audit_log, public.pf_callback_log, public.sports_bets from anon;
grant select on public.wallet_ledger, public.admin_audit_log, public.pf_callback_log, public.sports_bets to authenticated;
grant select on public.admin_wallet_reconciliation to authenticated;
