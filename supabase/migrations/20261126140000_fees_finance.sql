-- =============================================================================
-- Homologação, taxa de saque congelada no pedido, data da decisão e resumo financeiro.
-- =============================================================================

-- 1. Bloqueio de dinheiro real (já aplicado no banco; registrado aqui).
insert into public.app_settings (key, value) values ('real_money_enabled', 'false'::jsonb)
on conflict (key) do nothing;

create or replace function public.guard_real_money()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_enabled boolean;
  v_uid uuid := auth.uid();
begin
  if NEW.type::text not in ('deposit','withdrawal') then
    return NEW;
  end if;
  if TG_OP = 'UPDATE' and not (NEW.status::text = 'approved' and OLD.status::text <> 'approved') then
    return NEW;
  end if;
  select coalesce((value #>> '{}')::boolean, false) into v_enabled
    from public.app_settings where key = 'real_money_enabled';
  if coalesce(v_enabled, false) then
    return NEW;
  end if;
  -- Crédito/débito de teste lançado pelo admin continua permitido em homologação.
  if v_uid is not null and public.has_role(v_uid, 'admin') then
    return NEW;
  end if;
  raise exception 'REAL_MONEY_DISABLED: ambiente de homologação — depósitos e saques com dinheiro real estão desativados';
end $$;

drop trigger if exists trg_guard_real_money on public.transactions;
create trigger trg_guard_real_money
  before insert or update on public.transactions
  for each row execute function public.guard_real_money();
revoke all on function public.guard_real_money() from public, anon, authenticated;

-- 2. Taxa do saque fica gravada no pedido (mudar a taxa depois não altera pedidos antigos)
--    e a data em que o admin decidiu fica registrada pelo banco.
alter table public.transactions add column if not exists fee numeric(14,2) not null default 0;
alter table public.transactions add column if not exists decided_at timestamptz;
do $$ begin
  alter table public.transactions add constraint transactions_fee_range check (fee >= 0 and fee <= amount);
exception when duplicate_object then null; end $$;

create or replace function public.guard_transaction_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if NEW.user_id is distinct from OLD.user_id
     or NEW.type is distinct from OLD.type
     or NEW.amount is distinct from OLD.amount
     or NEW.fee is distinct from OLD.fee then
    raise exception 'TRANSACTION_IMMUTABLE_FIELDS';
  end if;
  if OLD.status::text in ('approved','rejected','cancelled','failed','completed')
     and NEW.status is distinct from OLD.status then
    raise exception 'TRANSACTION_ALREADY_FINAL';
  end if;
  if NEW.status is distinct from OLD.status then
    NEW.decided_at := now();
  else
    NEW.decided_at := OLD.decided_at;
  end if;
  return NEW;
end $$;
revoke all on function public.guard_transaction_update() from public, anon, authenticated;

-- 3. Jogos mais jogados: nome buscado à parte para não duplicar rodadas quando
--    dois provedores usam o mesmo código de jogo.
create or replace function public.admin_game_stats(p_days int, p_limit int default 20)
returns table (provider text, game_code text, game_name text, rounds bigint, players bigint, bets numeric, wins numeric, ggr numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  return query
  select s.provider, s.game_code,
         (select g.name from public.games g where g.game_code = s.game_code order by g.active desc limit 1),
         s.rounds, s.players, s.bets, s.wins, s.ggr
  from (
    select r.provider, r.game_code, count(*) as rounds, count(distinct r.user_id) as players,
           sum(r.bet)::numeric(14,2) as bets, sum(r.win)::numeric(14,2) as wins,
           (sum(r.bet) - sum(r.win))::numeric(14,2) as ggr
    from public.game_rounds r
    where r.created_at >= now() - make_interval(days => greatest(p_days, 1)) and r.status = 'settled'
    group by r.provider, r.game_code
  ) s
  order by s.bets desc
  limit greatest(p_limit, 1);
end $$;

-- 4. Resumo financeiro de um período (datas no fuso de São Paulo, fim incluído).
create or replace function public.admin_finance_summary(p_from date, p_to date)
returns table (
  deposits numeric, deposits_count int, depositors int,
  withdrawals numeric, withdrawals_count int, withdrawal_fees numeric,
  casino_bets numeric, casino_wins numeric, sports_stakes numeric, sports_returns numeric,
  adjustments numeric, ad_spend numeric, gateway_real numeric, gateway_fees numeric,
  liability numeric, pending_withdrawals numeric
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_from timestamptz := (p_from::timestamp at time zone 'America/Sao_Paulo');
  v_to   timestamptz := ((p_to + 1)::timestamp at time zone 'America/Sao_Paulo');
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  if p_to < p_from then raise exception 'INVALID_RANGE'; end if;
  return query
  with led as (
    select l.kind, l.amount, l.user_id from public.wallet_ledger l
    where l.created_at >= v_from and l.created_at < v_to
  ), wd as (
    select t.amount, t.fee from public.transactions t
    where t.type = 'withdrawal' and t.status = 'approved'
      and coalesce(t.decided_at, t.created_at) >= v_from and coalesce(t.decided_at, t.created_at) < v_to
  )
  select
    coalesce((select sum(amount) from led where kind = 'deposit'), 0)::numeric(14,2),
    (select count(*) from led where kind = 'deposit')::int,
    (select count(distinct user_id) from led where kind = 'deposit')::int,
    coalesce((select sum(amount) from wd), 0)::numeric(14,2),
    (select count(*) from wd)::int,
    coalesce((select sum(fee) from wd), 0)::numeric(14,2),
    coalesce((select -sum(amount) from led where kind = 'casino_bet'), 0)::numeric(14,2),
    coalesce((select sum(amount) from led where kind in ('casino_win','casino_refund')), 0)::numeric(14,2),
    coalesce((select -sum(amount) from led where kind = 'sports_stake'), 0)::numeric(14,2),
    coalesce((select sum(amount) from led where kind in ('sports_payout','sports_refund')), 0)::numeric(14,2),
    coalesce((select sum(amount) from led where kind = 'adjustment'), 0)::numeric(14,2),
    coalesce((select sum(a.amount) from public.ad_spend a where a.spend_date between p_from and p_to), 0)::numeric(14,2),
    coalesce((select sum(g.real_amount) from public.gateway_reconciliation g where g.ref_date between p_from and p_to), 0)::numeric(14,2),
    coalesce((select sum(g.fees) from public.gateway_reconciliation g where g.ref_date between p_from and p_to), 0)::numeric(14,2),
    coalesce((select sum(p.balance) from public.profiles p where p.balance > 0), 0)::numeric(14,2),
    coalesce((select sum(t.amount) from public.transactions t where t.type = 'withdrawal' and t.status = 'pending'), 0)::numeric(14,2);
end $$;
revoke all on function public.admin_finance_summary(date, date) from public, anon;
grant execute on function public.admin_finance_summary(date, date) to authenticated;
