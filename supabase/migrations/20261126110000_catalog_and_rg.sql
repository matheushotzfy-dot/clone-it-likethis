-- =============================================================================
-- Catálogo de jogos, registro de abertura de jogo e jogo responsável
-- Idempotente.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Catálogo (sincronizado da PlayFivers, só provedores oficiais)
-- ---------------------------------------------------------------------------
create table if not exists public.games (
  id            bigint generated always as identity primary key,
  provider_code text not null,          -- nome do provedor na PlayFivers (ex.: "OFICIAL - PG SOFT")
  provider      text not null,          -- nome limpo para exibir (ex.: "PG Soft")
  game_code     text not null,
  name          text not null,
  image_url     text,
  category      text not null default 'slot' check (category in ('slot','live','crash','table','other')),
  is_original   boolean not null default false,
  active        boolean not null default true,
  featured      boolean not null default false,
  sort_order    int not null default 1000,  -- menor aparece primeiro
  tags          text[] not null default '{}',
  last_seen_at  timestamptz not null default now(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (provider_code, game_code)
);
create index if not exists idx_games_lobby on public.games (active, category, sort_order, name);
create index if not exists idx_games_provider on public.games (provider, active);
create index if not exists idx_games_name on public.games (lower(name));

alter table public.games enable row level security;
drop policy if exists "games public read" on public.games;
create policy "games public read" on public.games for select to anon, authenticated using (active);
drop policy if exists "games admin read" on public.games;
create policy "games admin read" on public.games for select to authenticated using (public.has_role(auth.uid(), 'admin'));
drop policy if exists "games admin write" on public.games;
create policy "games admin write" on public.games for update to authenticated
  using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
grant select on public.games to anon, authenticated;
grant update (active, featured, sort_order, category, tags, updated_at) on public.games to authenticated;

create table if not exists public.game_launches (
  id            bigint generated always as identity primary key,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  provider_code text not null,
  game_code     text not null,
  game_name     text,
  balance       numeric(14,2),
  ok            boolean not null,
  error         text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_game_launches_created on public.game_launches (created_at desc);
create index if not exists idx_game_launches_user on public.game_launches (user_id, created_at desc);
alter table public.game_launches enable row level security;
drop policy if exists "launch admin read" on public.game_launches;
create policy "launch admin read" on public.game_launches for select to authenticated using (public.has_role(auth.uid(), 'admin'));
revoke all on public.game_launches from anon;
grant select on public.game_launches to authenticated;

-- ---------------------------------------------------------------------------
-- Jogo responsável
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists birth_date date;
alter table public.profiles add column if not exists last_seen_at timestamptz;

create table if not exists public.rg_limits (
  user_id              uuid primary key references public.profiles(id) on delete cascade,
  deposit_daily        numeric(14,2),
  deposit_weekly       numeric(14,2),
  deposit_monthly      numeric(14,2),
  loss_daily           numeric(14,2),
  session_minutes      int,
  self_excluded_until  timestamptz,
  self_excluded_reason text,
  -- Aumento de limite só vale depois de 24h; redução vale na hora.
  pending              jsonb,
  pending_effective_at timestamptz,
  updated_at           timestamptz not null default now()
);
alter table public.rg_limits enable row level security;
drop policy if exists "rg own read" on public.rg_limits;
create policy "rg own read" on public.rg_limits for select to authenticated using (auth.uid() = user_id);
drop policy if exists "rg admin read" on public.rg_limits;
create policy "rg admin read" on public.rg_limits for select to authenticated using (public.has_role(auth.uid(), 'admin'));
revoke all on public.rg_limits from anon;
grant select on public.rg_limits to authenticated;

-- Aplica aumentos pendentes cujo prazo de 24h venceu.
create or replace function public.rg_promote_pending(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.rg_limits%rowtype;
begin
  select * into v from public.rg_limits where user_id = p_user for update;
  if not found or v.pending is null or v.pending_effective_at > now() then
    return;
  end if;
  update public.rg_limits set
    deposit_daily   = case when v.pending ? 'deposit_daily'   then (v.pending->>'deposit_daily')::numeric   else deposit_daily end,
    deposit_weekly  = case when v.pending ? 'deposit_weekly'  then (v.pending->>'deposit_weekly')::numeric  else deposit_weekly end,
    deposit_monthly = case when v.pending ? 'deposit_monthly' then (v.pending->>'deposit_monthly')::numeric else deposit_monthly end,
    loss_daily      = case when v.pending ? 'loss_daily'      then (v.pending->>'loss_daily')::numeric      else loss_daily end,
    session_minutes = case when v.pending ? 'session_minutes' then (v.pending->>'session_minutes')::int     else session_minutes end,
    pending = null, pending_effective_at = null, updated_at = now()
  where user_id = p_user;
end $$;

-- Jogador define limites. null = sem limite. Reduzir vale na hora, aumentar/remover em 24h.
create or replace function public.rg_set_limits(
  p_deposit_daily numeric, p_deposit_weekly numeric, p_deposit_monthly numeric,
  p_loss_daily numeric, p_session_minutes int
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_cur  public.rg_limits%rowtype;
  v_now  jsonb := '{}'::jsonb;
  v_pend jsonb := '{}'::jsonb;
  k text;
  v_new numeric;
  v_old numeric;
  v_in  jsonb;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  insert into public.rg_limits (user_id) values (v_user) on conflict do nothing;
  perform public.rg_promote_pending(v_user);
  select * into v_cur from public.rg_limits where user_id = v_user for update;

  v_in := jsonb_build_object(
    'deposit_daily', p_deposit_daily, 'deposit_weekly', p_deposit_weekly, 'deposit_monthly', p_deposit_monthly,
    'loss_daily', p_loss_daily, 'session_minutes', p_session_minutes);

  for k in select jsonb_object_keys(v_in) loop
    v_new := nullif(v_in->>k, '')::numeric;
    if v_new is not null and v_new <= 0 then raise exception 'INVALID_LIMIT'; end if;
    v_old := (to_jsonb(v_cur)->>k)::numeric;
    if v_new is not distinct from v_old then
      continue;
    end if;
    -- Mais restritivo = aplica agora. Menos restritivo (maior ou sem limite) = espera 24h.
    if v_new is not null and (v_old is null or v_new < v_old) then
      v_now := v_now || jsonb_build_object(k, v_new);
    else
      v_pend := v_pend || jsonb_build_object(k, v_new);
    end if;
  end loop;

  update public.rg_limits set
    deposit_daily   = case when v_now ? 'deposit_daily'   then (v_now->>'deposit_daily')::numeric   else deposit_daily end,
    deposit_weekly  = case when v_now ? 'deposit_weekly'  then (v_now->>'deposit_weekly')::numeric  else deposit_weekly end,
    deposit_monthly = case when v_now ? 'deposit_monthly' then (v_now->>'deposit_monthly')::numeric else deposit_monthly end,
    loss_daily      = case when v_now ? 'loss_daily'      then (v_now->>'loss_daily')::numeric      else loss_daily end,
    session_minutes = case when v_now ? 'session_minutes' then (v_now->>'session_minutes')::int     else session_minutes end,
    pending = case when v_pend = '{}'::jsonb then pending else coalesce(pending, '{}'::jsonb) || v_pend end,
    pending_effective_at = case when v_pend = '{}'::jsonb then pending_effective_at else now() + interval '24 hours' end,
    updated_at = now()
  where user_id = v_user;

  return jsonb_build_object('applied', v_now, 'pending', v_pend);
end $$;

-- Autoexclusão: só o jogador inicia, e não dá pra encurtar.
create or replace function public.rg_self_exclude(p_days int, p_reason text)
returns timestamptz
language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_until timestamptz;
begin
  if v_user is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_days not in (1, 7, 30, 90, 180, 365, 3650) then raise exception 'INVALID_PERIOD'; end if;
  insert into public.rg_limits (user_id) values (v_user) on conflict do nothing;
  v_until := now() + make_interval(days => p_days);
  update public.rg_limits
     set self_excluded_until = greatest(coalesce(self_excluded_until, now()), v_until),
         self_excluded_reason = left(p_reason, 300),
         updated_at = now()
   where user_id = v_user
  returning self_excluded_until into v_until;
  return v_until;
end $$;

-- Verificação central usada antes de qualquer aposta ou depósito.
-- p_action: deposit | bet
create or replace function public.rg_check(p_user uuid, p_action text, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.rg_limits%rowtype;
  v_sum numeric;
  v_day_start timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
  perform public.rg_promote_pending(p_user);
  select * into v from public.rg_limits where user_id = p_user;
  if not found then return; end if;

  if v.self_excluded_until is not null and v.self_excluded_until > now() then
    raise exception 'SELF_EXCLUDED';
  end if;

  if p_action = 'deposit' then
    if v.deposit_daily is not null then
      select coalesce(sum(amount), 0) into v_sum from public.transactions
       where user_id = p_user and type = 'deposit' and status in ('pending','approved') and created_at >= v_day_start;
      if v_sum + p_amount > v.deposit_daily then raise exception 'LIMIT_DEPOSIT_DAILY'; end if;
    end if;
    if v.deposit_weekly is not null then
      select coalesce(sum(amount), 0) into v_sum from public.transactions
       where user_id = p_user and type = 'deposit' and status in ('pending','approved') and created_at >= now() - interval '7 days';
      if v_sum + p_amount > v.deposit_weekly then raise exception 'LIMIT_DEPOSIT_WEEKLY'; end if;
    end if;
    if v.deposit_monthly is not null then
      select coalesce(sum(amount), 0) into v_sum from public.transactions
       where user_id = p_user and type = 'deposit' and status in ('pending','approved') and created_at >= now() - interval '30 days';
      if v_sum + p_amount > v.deposit_monthly then raise exception 'LIMIT_DEPOSIT_MONTHLY'; end if;
    end if;
  elsif p_action = 'bet' then
    if v.loss_daily is not null then
      -- perda líquida do dia = apostas - ganhos - estornos (cassino + esportes)
      select coalesce(-sum(amount), 0) into v_sum from public.wallet_ledger
       where user_id = p_user and created_at >= v_day_start
         and kind in ('casino_bet','casino_win','casino_refund','sports_stake','sports_payout','sports_refund');
      if v_sum + p_amount > v.loss_daily then raise exception 'LIMIT_LOSS_DAILY'; end if;
    end if;
  end if;
end $$;

-- Liga o rg_check nas apostas (cassino e esportes) sem mexer na assinatura.
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

  if v_bet > 0 then
    if v_frozen then raise exception 'USER_FROZEN'; end if;
    perform public.rg_check(p_user_id, 'bet', v_bet);
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
  perform public.rg_check(p_user_id, 'bet', v_stake);

  insert into public.sports_bets (id, user_id, event_id, league, league_name, home, away, starts_at,
    pick, odd, stake, potential_payout)
  values (v_id, p_user_id, p_event_id, p_league, p_league_name, p_home, p_away, p_starts_at,
    p_pick, v_odd, v_stake, round(v_stake * v_odd, 2));

  v_bal := public.wallet_apply(p_user_id, -v_stake, 'sports_stake', 'sb:' || v_id || ':stake',
    'sports_bets', v_id::text, p_home || ' x ' || p_away);

  return query select v_id, v_bal;
end $$;

-- Cadastro: grava data de nascimento vinda do formulário.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_base text;
  v_username text;
  v_suffix int := 0;
  v_birth date;
begin
  begin
    v_birth := nullif(NEW.raw_user_meta_data->>'birth_date', '')::date;
  exception when others then
    v_birth := null;
  end;
  v_base := coalesce(nullif(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1), 'user');
  v_base := regexp_replace(v_base, '[^a-zA-Z0-9_]', '', 'g');
  if v_base = '' then v_base := 'user'; end if;
  v_username := v_base;
  while exists (select 1 from public.profiles where username = v_username) loop
    v_suffix := v_suffix + 1;
    v_username := v_base || v_suffix::text;
    if v_suffix > 50 then
      v_username := v_base || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      exit;
    end if;
  end loop;

  insert into public.profiles (
    id, username, full_name, cpf, phone, birth_date,
    bonus_expires_at, bonus_used,
    signup_ip, signup_user_agent, referrer,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    fbp, fbc
  ) values (
    NEW.id, v_username,
    coalesce(NEW.raw_user_meta_data->>'full_name', ''),
    nullif(NEW.raw_user_meta_data->>'cpf', ''),
    nullif(NEW.raw_user_meta_data->>'phone', ''),
    v_birth,
    null, true,
    nullif(NEW.raw_user_meta_data->>'signup_ip', ''),
    nullif(NEW.raw_user_meta_data->>'signup_user_agent', ''),
    nullif(NEW.raw_user_meta_data->>'referrer', ''),
    nullif(NEW.raw_user_meta_data->>'utm_source', ''),
    nullif(NEW.raw_user_meta_data->>'utm_medium', ''),
    nullif(NEW.raw_user_meta_data->>'utm_campaign', ''),
    nullif(NEW.raw_user_meta_data->>'utm_content', ''),
    nullif(NEW.raw_user_meta_data->>'utm_term', ''),
    nullif(NEW.raw_user_meta_data->>'fbp', ''),
    nullif(NEW.raw_user_meta_data->>'fbc', '')
  );
  insert into public.user_roles (user_id, role) values (NEW.id, 'user');
  return NEW;
exception when others then
  insert into public.profiles (id, username, cpf, phone, bonus_used)
  values (
    NEW.id,
    'user_' || substr(replace(NEW.id::text, '-', ''), 1, 12),
    nullif(NEW.raw_user_meta_data->>'cpf', ''),
    nullif(NEW.raw_user_meta_data->>'phone', ''),
    true
  ) on conflict (id) do nothing;
  insert into public.user_roles (user_id, role) values (NEW.id, 'user') on conflict do nothing;
  return NEW;
end $$;

-- birth_date: o jogador preenche uma vez; depois só o admin muda.
create or replace function public.prevent_profile_tampering()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
begin
  if v_uid is not null then
    v_is_admin := public.has_role(v_uid, 'admin');
  end if;
  if v_uid is null or v_is_admin then
    return NEW;
  end if;
  if NEW.balance is distinct from OLD.balance
     or NEW.bonus_balance is distinct from OLD.bonus_balance
     or NEW.bonus_used is distinct from OLD.bonus_used
     or NEW.bonus_expires_at is distinct from OLD.bonus_expires_at
     or NEW.kyc_status is distinct from OLD.kyc_status
     or NEW.kyc_verified is distinct from OLD.kyc_verified
     or NEW.is_frozen is distinct from OLD.is_frozen
     or NEW.freeze_reason is distinct from OLD.freeze_reason then
    raise exception 'Não é permitido alterar saldo/kyc/congelamento diretamente';
  end if;
  if (OLD.cpf is not null and NEW.cpf is distinct from OLD.cpf)
     or (OLD.birth_date is not null and NEW.birth_date is distinct from OLD.birth_date)
     or NEW.signup_ip is distinct from OLD.signup_ip
     or NEW.signup_user_agent is distinct from OLD.signup_user_agent
     or NEW.referrer is distinct from OLD.referrer
     or NEW.utm_source is distinct from OLD.utm_source
     or NEW.utm_medium is distinct from OLD.utm_medium
     or NEW.utm_campaign is distinct from OLD.utm_campaign
     or NEW.utm_content is distinct from OLD.utm_content
     or NEW.utm_term is distinct from OLD.utm_term
     or NEW.fbp is distinct from OLD.fbp
     or NEW.fbc is distinct from OLD.fbc then
    raise exception 'Campos de identidade/tracking não podem ser alterados pelo usuário';
  end if;
  return NEW;
end $$;

-- Havia dois triggers idênticos chamando a mesma função.
drop trigger if exists prevent_profile_tampering_before_update on public.profiles;

-- Configurações de jogo e apostas.
insert into public.app_settings (key, value) values
  ('min_bet_sports', '1'::jsonb),
  ('max_bet_sports', '5000'::jsonb),
  ('max_payout_sports', '50000'::jsonb),
  ('casino_enabled', 'true'::jsonb),
  ('sports_enabled', 'true'::jsonb),
  ('signup_enabled', 'true'::jsonb)
on conflict (key) do nothing;

drop policy if exists "public settings readable by authenticated" on public.app_settings;
create policy "public settings readable by authenticated" on public.app_settings
  for select to authenticated
  using (key = any (array['min_deposit','max_deposit','min_withdraw','max_withdraw','withdrawal_fee_pct',
    'maintenance_mode','active_gateway','real_money_enabled','min_bet_sports','max_bet_sports',
    'max_payout_sports','casino_enabled','sports_enabled','signup_enabled']));

-- Permissões
revoke all on function public.rg_promote_pending(uuid) from public, anon, authenticated;
revoke all on function public.rg_check(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.rg_check(uuid, text, numeric) to service_role;
revoke all on function public.rg_set_limits(numeric, numeric, numeric, numeric, int) from public, anon;
grant execute on function public.rg_set_limits(numeric, numeric, numeric, numeric, int) to authenticated;
revoke all on function public.rg_self_exclude(int, text) from public, anon;
grant execute on function public.rg_self_exclude(int, text) to authenticated;
revoke all on function public.apply_playfivers_transaction(uuid, text, text, text, text, text, text, numeric, numeric, jsonb) from public, anon, authenticated;
grant execute on function public.apply_playfivers_transaction(uuid, text, text, text, text, text, text, numeric, numeric, jsonb) to service_role;
revoke all on function public.place_sports_bet(uuid, text, text, text, text, text, timestamptz, text, numeric, numeric) from public, anon, authenticated;
grant execute on function public.place_sports_bet(uuid, text, text, text, text, text, timestamptz, text, numeric, numeric) to service_role;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.prevent_profile_tampering() from public, anon, authenticated;
