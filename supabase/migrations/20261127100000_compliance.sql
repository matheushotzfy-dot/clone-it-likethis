-- =============================================================================
-- Conformidade com a Portaria SPA/MF 1.231/2024 (cadastro, autenticação, jogo
-- responsável e direitos do apostador) e gateway de teste para homologação.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Cadastro (art. 31), identidade, login (art. 36), termos (arts. 46-47) e conta
-- -----------------------------------------------------------------------------
alter table public.profiles
  add column if not exists nationality text,
  add column if not exists address_zip text,
  add column if not exists address_street text,
  add column if not exists address_number text,
  add column if not exists address_complement text,
  add column if not exists address_district text,
  add column if not exists address_city text,
  add column if not exists address_state text,
  add column if not exists country text not null default 'BR',
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz,
  add column if not exists privacy_consent_at timestamptz,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_reason text,
  add column if not exists last_login_at timestamptz,
  add column if not exists previous_login_at timestamptz,
  add column if not exists last_login_ip text,
  add column if not exists failed_logins int not null default 0,
  add column if not exists locked_at timestamptz,
  add column if not exists session_started_at timestamptz,
  add column if not exists limits_prompted_at timestamptz;

-- kyc_status vira o status da verificação de identidade:
-- none (não enviou), pending (em análise), verified, rejected.
update public.profiles p
   set kyc_status = case
     when p.kyc_verified then 'verified'
     when exists (select 1 from public.kyc_submissions k where k.user_id = p.id and k.status = 'pending') then 'pending'
     else 'none' end
 where p.kyc_status is null or p.kyc_status not in ('none', 'pending', 'verified', 'rejected')
    or (p.kyc_status = 'pending' and not exists (select 1 from public.kyc_submissions k where k.user_id = p.id and k.status = 'pending'));
alter table public.profiles alter column kyc_status set default 'none';
do $$ begin
  alter table public.profiles add constraint profiles_kyc_status_check
    check (kyc_status in ('none', 'pending', 'verified', 'rejected'));
exception when duplicate_object then null; end $$;

create or replace function public.cpf_taken(p_cpf text, p_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where cpf = p_cpf and id <> p_id);
$$;
revoke all on function public.cpf_taken(text, uuid) from public, anon;
grant execute on function public.cpf_taken(text, uuid) to authenticated, service_role;

-- Guarda sem SECURITY DEFINER: current_user é quem está gravando.
-- 'authenticated' = jogador direto pela API; funções do banco (definer) e o servidor
-- (service_role) gravam como outro papel e passam.
create or replace function public.prevent_profile_tampering()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return NEW; end if;
  if public.has_role(auth.uid(), 'admin') then return NEW; end if;
  if NEW.balance is distinct from OLD.balance
     or NEW.bonus_balance is distinct from OLD.bonus_balance
     or NEW.bonus_used is distinct from OLD.bonus_used
     or NEW.bonus_expires_at is distinct from OLD.bonus_expires_at
     or NEW.kyc_status is distinct from OLD.kyc_status
     or NEW.kyc_verified is distinct from OLD.kyc_verified
     or NEW.is_frozen is distinct from OLD.is_frozen
     or NEW.freeze_reason is distinct from OLD.freeze_reason
     or NEW.created_at is distinct from OLD.created_at
     or NEW.closed_at is distinct from OLD.closed_at
     or NEW.closed_reason is distinct from OLD.closed_reason
     or NEW.last_login_at is distinct from OLD.last_login_at
     or NEW.previous_login_at is distinct from OLD.previous_login_at
     or NEW.last_login_ip is distinct from OLD.last_login_ip
     or NEW.failed_logins is distinct from OLD.failed_logins
     or NEW.locked_at is distinct from OLD.locked_at
     or NEW.session_started_at is distinct from OLD.session_started_at
     or NEW.terms_version is distinct from OLD.terms_version
     or NEW.terms_accepted_at is distinct from OLD.terms_accepted_at
     or NEW.privacy_consent_at is distinct from OLD.privacy_consent_at
     or NEW.limits_prompted_at is distinct from OLD.limits_prompted_at then
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
  if OLD.cpf is null and NEW.cpf is not null then
    NEW.cpf := regexp_replace(NEW.cpf, '\D', '', 'g');
    if not public.is_valid_cpf(NEW.cpf) then raise exception 'SIGNUP_INVALID_CPF'; end if;
    if public.cpf_taken(NEW.cpf, NEW.id) then raise exception 'SIGNUP_CPF_TAKEN'; end if;
  end if;
  if OLD.birth_date is null and NEW.birth_date is not null then
    if NEW.birth_date > (current_date - interval '18 years')::date or NEW.birth_date < date '1900-01-01' then
      raise exception 'SIGNUP_UNDERAGE';
    end if;
  end if;
  if NEW.address_state is not null and NEW.address_state !~ '^[A-Z]{2}$' then raise exception 'INVALID_ADDRESS'; end if;
  if NEW.address_zip is not null and NEW.address_zip !~ '^\d{8}$' then raise exception 'INVALID_ADDRESS'; end if;
  return NEW;
end $$;
revoke all on function public.prevent_profile_tampering() from public, anon, authenticated;
grant execute on function public.prevent_profile_tampering() to authenticated;

-- Cadastro: exige endereço, nacionalidade, aceite dos termos e consentimento LGPD.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  m          jsonb := coalesce(NEW.raw_user_meta_data, '{}'::jsonb);
  v_base     text;
  v_username text;
  v_suffix   int := 0;
  v_birth    date;
  v_cpf      text := nullif(regexp_replace(coalesce(m->>'cpf', ''), '\D', '', 'g'), '');
  v_zip      text := nullif(regexp_replace(coalesce(m->>'address_zip', ''), '\D', '', 'g'), '');
  v_state    text := upper(nullif(trim(coalesce(m->>'address_state', '')), ''));
  v_open     boolean;
  v_admin_created boolean := coalesce((NEW.raw_app_meta_data->>'created_by_admin')::boolean, false);
begin
  if not v_admin_created then
    select coalesce((value #>> '{}')::boolean, true) into v_open from public.app_settings where key = 'signup_enabled';
    if v_open is false then raise exception 'SIGNUP_CLOSED'; end if;

    if v_cpf is null or not public.is_valid_cpf(v_cpf) then raise exception 'SIGNUP_CPF_INVALID'; end if;
    if exists (select 1 from public.profiles where cpf = v_cpf) then raise exception 'SIGNUP_CPF_TAKEN'; end if;

    begin
      v_birth := nullif(m->>'birth_date', '')::date;
    exception when others then
      v_birth := null;
    end;
    if v_birth is null then raise exception 'SIGNUP_BIRTHDATE_REQUIRED'; end if;
    if v_birth > (now() at time zone 'America/Sao_Paulo')::date - interval '18 years' then raise exception 'SIGNUP_UNDERAGE'; end if;
    if v_birth < date '1900-01-01' then raise exception 'SIGNUP_BIRTHDATE_INVALID'; end if;

    if v_zip is null or v_zip !~ '^\d{8}$'
       or coalesce(trim(m->>'address_street'), '') = ''
       or coalesce(trim(m->>'address_number'), '') = ''
       or coalesce(trim(m->>'address_city'), '') = ''
       or v_state is null or v_state !~ '^[A-Z]{2}$'
       or coalesce(trim(m->>'nationality'), '') = '' then
      raise exception 'SIGNUP_ADDRESS_REQUIRED';
    end if;
    if coalesce(m->>'terms_version', '') = '' or coalesce((m->>'privacy_consent')::boolean, false) is not true then
      raise exception 'SIGNUP_TERMS_REQUIRED';
    end if;
  end if;

  v_base := coalesce(nullif(m->>'username', ''), split_part(NEW.email, '@', 1), 'user');
  v_base := lower(regexp_replace(v_base, '[^a-zA-Z0-9_]', '', 'g'));
  if v_base = '' then v_base := 'user'; end if;
  v_username := left(v_base, 30);
  while exists (select 1 from public.profiles where username = v_username) loop
    v_suffix := v_suffix + 1;
    v_username := left(v_base, 26) || v_suffix::text;
    if v_suffix > 50 then
      v_username := left(v_base, 20) || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
      exit;
    end if;
  end loop;

  insert into public.profiles (
    id, username, full_name, cpf, phone, birth_date,
    bonus_expires_at, bonus_used,
    signup_ip, signup_user_agent, referrer,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term, fbp, fbc,
    nationality, address_zip, address_street, address_number, address_complement,
    address_district, address_city, address_state, country,
    terms_version, terms_accepted_at, privacy_consent_at, kyc_status
  ) values (
    NEW.id, v_username,
    left(trim(coalesce(m->>'full_name', '')), 120),
    v_cpf,
    nullif(regexp_replace(coalesce(m->>'phone', ''), '\D', '', 'g'), ''),
    v_birth,
    null, true,
    left(nullif(m->>'signup_ip', ''), 64),
    left(nullif(m->>'signup_user_agent', ''), 400),
    nullif(m->>'referrer', ''),
    nullif(m->>'utm_source', ''), nullif(m->>'utm_medium', ''), nullif(m->>'utm_campaign', ''),
    nullif(m->>'utm_content', ''), nullif(m->>'utm_term', ''),
    nullif(m->>'fbp', ''), nullif(m->>'fbc', ''),
    left(nullif(trim(m->>'nationality'), ''), 60),
    v_zip,
    left(nullif(trim(m->>'address_street'), ''), 160),
    left(nullif(trim(m->>'address_number'), ''), 20),
    left(nullif(trim(m->>'address_complement'), ''), 80),
    left(nullif(trim(m->>'address_district'), ''), 80),
    left(nullif(trim(m->>'address_city'), ''), 80),
    v_state,
    coalesce(nullif(upper(trim(m->>'country')), ''), 'BR'),
    nullif(m->>'terms_version', ''),
    case when nullif(m->>'terms_version', '') is not null then now() end,
    case when coalesce((m->>'privacy_consent')::boolean, false) then now() end,
    'none'
  );
  insert into public.user_roles (user_id, role) values (NEW.id, 'user') on conflict do nothing;
  return NEW;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- Registro de tentativa de login feito pelo servidor (bloqueio após 3 erros, último acesso).
create or replace function public.auth_record_login(p_user uuid, p_success boolean, p_ip text)
returns table (failed int, locked boolean)
language plpgsql security definer set search_path = public as $$
begin
  if p_success then
    update public.profiles set
      previous_login_at = last_login_at,
      last_login_at = now(),
      last_login_ip = left(p_ip, 64),
      failed_logins = 0,
      locked_at = null,
      session_started_at = now(),
      last_seen_at = now()
    where id = p_user;
  else
    update public.profiles set
      failed_logins = failed_logins + 1,
      locked_at = case when failed_logins + 1 >= 3 then coalesce(locked_at, now()) else locked_at end
    where id = p_user;
  end if;
  return query select pr.failed_logins, pr.locked_at is not null from public.profiles pr where pr.id = p_user;
end $$;
revoke all on function public.auth_record_login(uuid, boolean, text) from public, anon, authenticated;
grant execute on function public.auth_record_login(uuid, boolean, text) to service_role;

-- O próprio titular desbloqueia ao trocar a senha pelo link do e-mail (sessão de recuperação).
create or replace function public.auth_clear_lock()
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  update public.profiles set failed_logins = 0, locked_at = null where id = auth.uid();
end $$;
revoke all on function public.auth_clear_lock() from public, anon;
grant execute on function public.auth_clear_lock() to authenticated;

-- Sessão: atividade contínua; um intervalo de 30 min sem sinal começa sessão nova.
create or replace function public.touch_last_seen()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set
    session_started_at = case
      when session_started_at is null or last_seen_at is null or last_seen_at < now() - interval '30 minutes'
        then now() else session_started_at end,
    last_seen_at = now()
  where id = auth.uid() and (last_seen_at is null or last_seen_at < now() - interval '1 minute');
end $$;
revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;

-- Aceite dos termos e da política de privacidade (nova versão pede novo aceite).
create or replace function public.accept_terms(p_version text)
returns void language plpgsql security definer set search_path = public as $$
declare v_current text;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select value #>> '{}' into v_current from public.app_settings where key = 'terms_version';
  if p_version is distinct from v_current then raise exception 'TERMS_VERSION_MISMATCH'; end if;
  update public.profiles set terms_version = p_version, terms_accepted_at = now(),
    privacy_consent_at = coalesce(privacy_consent_at, now())
  where id = auth.uid();
end $$;
revoke all on function public.accept_terms(text) from public, anon;
grant execute on function public.accept_terms(text) to authenticated;

-- Encerrar a conta (art. 23, VII): sem saldo e sem saque em aberto.
create or replace function public.close_my_account(p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_bal numeric; v_pending int;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  select balance into v_bal from public.profiles where id = auth.uid() for update;
  if coalesce(v_bal, 0) > 0 then raise exception 'ACCOUNT_HAS_BALANCE'; end if;
  select count(*) into v_pending from public.transactions
   where user_id = auth.uid() and status = 'pending';
  if v_pending > 0 then raise exception 'ACCOUNT_HAS_PENDING'; end if;
  update public.profiles set closed_at = now(), closed_reason = left(coalesce(p_reason, ''), 300)
   where id = auth.uid() and closed_at is null;
end $$;
revoke all on function public.close_my_account(text) from public, anon;
grant execute on function public.close_my_account(text) to authenticated;

create or replace function public.mark_limits_prompted()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles set limits_prompted_at = coalesce(limits_prompted_at, now()) where id = auth.uid();
end $$;
revoke all on function public.mark_limits_prompted() from public, anon;
grant execute on function public.mark_limits_prompted() to authenticated;

-- -----------------------------------------------------------------------------
-- 2. Jogo responsável (art. 4º): limites de perda por período, número de apostas,
--    alerta de tempo, pausa e checagem única antes de depósito e aposta.
-- -----------------------------------------------------------------------------
alter table public.rg_limits
  add column if not exists loss_weekly numeric(14,2),
  add column if not exists loss_monthly numeric(14,2),
  add column if not exists bets_daily int,
  add column if not exists session_alert_minutes int,
  add column if not exists paused_until timestamptz,
  add column if not exists paused_at timestamptz;

create or replace function public.rg_promote_pending(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.rg_limits%rowtype;
begin
  select * into v from public.rg_limits where user_id = p_user for update;
  if not found then return; end if;
  -- Fim de pausa pedido pelo titular vale só depois de 24 h (§2º).
  if v.paused_until is not null and v.paused_until <= now() then
    update public.rg_limits set paused_until = null, paused_at = null, updated_at = now() where user_id = p_user;
  end if;
  if v.pending is null or v.pending_effective_at > now() then return; end if;
  update public.rg_limits set
    deposit_daily   = case when v.pending ? 'deposit_daily'   then (v.pending->>'deposit_daily')::numeric   else deposit_daily end,
    deposit_weekly  = case when v.pending ? 'deposit_weekly'  then (v.pending->>'deposit_weekly')::numeric  else deposit_weekly end,
    deposit_monthly = case when v.pending ? 'deposit_monthly' then (v.pending->>'deposit_monthly')::numeric else deposit_monthly end,
    loss_daily      = case when v.pending ? 'loss_daily'      then (v.pending->>'loss_daily')::numeric      else loss_daily end,
    loss_weekly     = case when v.pending ? 'loss_weekly'     then (v.pending->>'loss_weekly')::numeric     else loss_weekly end,
    loss_monthly    = case when v.pending ? 'loss_monthly'    then (v.pending->>'loss_monthly')::numeric    else loss_monthly end,
    bets_daily      = case when v.pending ? 'bets_daily'      then (v.pending->>'bets_daily')::int          else bets_daily end,
    session_minutes = case when v.pending ? 'session_minutes' then (v.pending->>'session_minutes')::int     else session_minutes end,
    pending = null, pending_effective_at = null, updated_at = now()
  where user_id = p_user;
end $$;
revoke all on function public.rg_promote_pending(uuid) from public, anon, authenticated;

drop function if exists public.rg_set_limits(numeric, numeric, numeric, numeric, integer);
create or replace function public.rg_set_limits(
  p_deposit_daily numeric, p_deposit_weekly numeric, p_deposit_monthly numeric,
  p_loss_daily numeric, p_loss_weekly numeric, p_loss_monthly numeric,
  p_bets_daily integer, p_session_minutes integer, p_session_alert_minutes integer
) returns jsonb language plpgsql security definer set search_path = public as $$
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
  if p_session_alert_minutes is not null and p_session_alert_minutes not in (15, 30, 45, 60, 90, 120) then
    raise exception 'INVALID_LIMIT';
  end if;
  insert into public.rg_limits (user_id) values (v_user) on conflict do nothing;
  perform public.rg_promote_pending(v_user);
  select * into v_cur from public.rg_limits where user_id = v_user for update;

  v_in := jsonb_build_object(
    'deposit_daily', p_deposit_daily, 'deposit_weekly', p_deposit_weekly, 'deposit_monthly', p_deposit_monthly,
    'loss_daily', p_loss_daily, 'loss_weekly', p_loss_weekly, 'loss_monthly', p_loss_monthly,
    'bets_daily', p_bets_daily, 'session_minutes', p_session_minutes);

  for k in select jsonb_object_keys(v_in) loop
    v_new := nullif(v_in->>k, '')::numeric;
    if v_new is not null and v_new <= 0 then raise exception 'INVALID_LIMIT'; end if;
    v_old := (to_jsonb(v_cur)->>k)::numeric;
    if v_new is not distinct from v_old then continue; end if;
    -- Reduzir (ou criar) vale na hora; aumentar ou remover vale em 24 h.
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
    loss_weekly     = case when v_now ? 'loss_weekly'     then (v_now->>'loss_weekly')::numeric     else loss_weekly end,
    loss_monthly    = case when v_now ? 'loss_monthly'    then (v_now->>'loss_monthly')::numeric    else loss_monthly end,
    bets_daily      = case when v_now ? 'bets_daily'      then (v_now->>'bets_daily')::int          else bets_daily end,
    session_minutes = case when v_now ? 'session_minutes' then (v_now->>'session_minutes')::int     else session_minutes end,
    -- Alerta de tempo é aviso, não limite: muda na hora em qualquer direção.
    session_alert_minutes = p_session_alert_minutes,
    pending = case when v_pend = '{}'::jsonb then pending else coalesce(pending, '{}'::jsonb) || v_pend end,
    pending_effective_at = case when v_pend = '{}'::jsonb then pending_effective_at else now() + interval '24 hours' end,
    updated_at = now()
  where user_id = v_user;

  return jsonb_build_object('applied', v_now, 'pending', v_pend);
end $$;
revoke all on function public.rg_set_limits(numeric, numeric, numeric, numeric, numeric, numeric, integer, integer, integer) from public, anon;
grant execute on function public.rg_set_limits(numeric, numeric, numeric, numeric, numeric, numeric, integer, integer, integer) to authenticated;

-- Pausa (art. 4º, IV, c): acessa a conta, consulta e saca, mas não aposta nem deposita.
create or replace function public.rg_pause(p_days integer)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_until timestamptz;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  if p_days not in (1, 3, 7, 14, 30) then raise exception 'INVALID_PERIOD'; end if;
  insert into public.rg_limits (user_id) values (auth.uid()) on conflict do nothing;
  update public.rg_limits set
    paused_until = greatest(coalesce(paused_until, now()), now() + make_interval(days => p_days)),
    paused_at = coalesce(paused_at, now()),
    updated_at = now()
  where user_id = auth.uid()
  returning paused_until into v_until;
  return v_until;
end $$;
revoke all on function public.rg_pause(integer) from public, anon;
grant execute on function public.rg_pause(integer) to authenticated;

-- Encerrar a pausa antes do fim só vale depois de 24 h (§2º).
create or replace function public.rg_end_pause()
returns timestamptz language plpgsql security definer set search_path = public as $$
declare v_until timestamptz;
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  update public.rg_limits set paused_until = least(paused_until, now() + interval '24 hours'), updated_at = now()
   where user_id = auth.uid() and paused_until > now()
  returning paused_until into v_until;
  return v_until;
end $$;
revoke all on function public.rg_end_pause() from public, anon;
grant execute on function public.rg_end_pause() to authenticated;

create or replace function public.rg_check(p_user uuid, p_action text, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $$
declare
  v public.rg_limits%rowtype;
  p record;
  v_sum numeric;
  v_cnt int;
  v_require_identity boolean;
  v_day_start timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
  select pr.closed_at, pr.kyc_status, pr.session_started_at into p from public.profiles pr where pr.id = p_user;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  if p.closed_at is not null then raise exception 'ACCOUNT_CLOSED'; end if;

  select coalesce((value #>> '{}')::boolean, true) into v_require_identity
    from public.app_settings where key = 'require_identity';
  if coalesce(v_require_identity, true) and p.kyc_status <> 'verified' then
    raise exception 'IDENTITY_REQUIRED';
  end if;

  perform public.rg_promote_pending(p_user);
  select * into v from public.rg_limits where user_id = p_user;
  if not found then return; end if;

  if v.self_excluded_until is not null and v.self_excluded_until > now() then raise exception 'SELF_EXCLUDED'; end if;
  if v.paused_until is not null and v.paused_until > now() then raise exception 'PAUSED'; end if;

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
    if v.loss_daily is not null or v.loss_weekly is not null or v.loss_monthly is not null then
      if v.loss_daily is not null then
        select coalesce(-sum(amount), 0) into v_sum from public.wallet_ledger
         where user_id = p_user and created_at >= v_day_start
           and kind in ('casino_bet','casino_win','casino_refund','sports_stake','sports_payout','sports_refund');
        if v_sum + p_amount > v.loss_daily then raise exception 'LIMIT_LOSS_DAILY'; end if;
      end if;
      if v.loss_weekly is not null then
        select coalesce(-sum(amount), 0) into v_sum from public.wallet_ledger
         where user_id = p_user and created_at >= now() - interval '7 days'
           and kind in ('casino_bet','casino_win','casino_refund','sports_stake','sports_payout','sports_refund');
        if v_sum + p_amount > v.loss_weekly then raise exception 'LIMIT_LOSS_WEEKLY'; end if;
      end if;
      if v.loss_monthly is not null then
        select coalesce(-sum(amount), 0) into v_sum from public.wallet_ledger
         where user_id = p_user and created_at >= now() - interval '30 days'
           and kind in ('casino_bet','casino_win','casino_refund','sports_stake','sports_payout','sports_refund');
        if v_sum + p_amount > v.loss_monthly then raise exception 'LIMIT_LOSS_MONTHLY'; end if;
      end if;
    end if;
    -- p_amount = 0 é a checagem de abertura de jogo: não conta como aposta.
    if v.bets_daily is not null and p_amount > 0 then
      select count(*) into v_cnt from public.wallet_ledger
       where user_id = p_user and created_at >= v_day_start and kind in ('casino_bet','sports_stake');
      if v_cnt + 1 > v.bets_daily then raise exception 'LIMIT_BETS_DAILY'; end if;
    end if;
    if v.session_minutes is not null and p.session_started_at is not null
       and p.session_started_at < now() - make_interval(mins => v.session_minutes) then
      raise exception 'LIMIT_SESSION';
    end if;
  end if;
end $$;
revoke all on function public.rg_check(uuid, text, numeric) from public, anon, authenticated;
grant execute on function public.rg_check(uuid, text, numeric) to service_role;

-- Situação do titular para o painel permanente (art. 4º, X) e a tela de limites.
create or replace function public.my_rg_status()
returns table (
  session_started_at timestamptz, today_result numeric, today_deposits numeric, today_bets int,
  last_login_at timestamptz, previous_login_at timestamptz
) language sql stable security definer set search_path = public as $$
  with d as (select date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo' as s)
  select pr.session_started_at,
    coalesce((select sum(l.amount) from public.wallet_ledger l, d where l.user_id = pr.id and l.created_at >= d.s
       and l.kind in ('casino_bet','casino_win','casino_refund','sports_stake','sports_payout','sports_refund')), 0)::numeric(14,2),
    coalesce((select sum(l.amount) from public.wallet_ledger l, d where l.user_id = pr.id and l.created_at >= d.s and l.kind = 'deposit'), 0)::numeric(14,2),
    (select count(*) from public.wallet_ledger l, d where l.user_id = pr.id and l.created_at >= d.s and l.kind in ('casino_bet','sports_stake'))::int,
    pr.last_login_at, pr.previous_login_at
  from public.profiles pr where pr.id = auth.uid();
$$;
revoke all on function public.my_rg_status() from public, anon;
grant execute on function public.my_rg_status() to authenticated;

-- -----------------------------------------------------------------------------
-- 3. Informe anual para o Imposto de Renda (art. 41)
-- -----------------------------------------------------------------------------
create or replace function public.my_annual_statement(p_year int)
returns table (deposits numeric, withdrawals numeric, bets numeric, prizes numeric, refunds numeric, net numeric)
language plpgsql stable security definer set search_path = public as $$
declare
  v_from timestamptz := make_timestamptz(p_year, 1, 1, 0, 0, 0, 'America/Sao_Paulo');
  v_to   timestamptz := make_timestamptz(p_year + 1, 1, 1, 0, 0, 0, 'America/Sao_Paulo');
begin
  if auth.uid() is null then raise exception 'UNAUTHENTICATED'; end if;
  return query
  with l as (select wl.kind, wl.amount from public.wallet_ledger wl
              where wl.user_id = auth.uid() and wl.created_at >= v_from and wl.created_at < v_to)
  select
    coalesce((select sum(l.amount) from l where l.kind = 'deposit'), 0)::numeric(14,2),
    coalesce((select sum(t.amount) from public.transactions t where t.user_id = auth.uid() and t.type = 'withdrawal'
               and t.status = 'approved' and coalesce(t.decided_at, t.created_at) >= v_from and coalesce(t.decided_at, t.created_at) < v_to), 0)::numeric(14,2),
    coalesce((select -sum(l.amount) from l where l.kind in ('casino_bet','sports_stake')), 0)::numeric(14,2),
    coalesce((select sum(l.amount) from l where l.kind in ('casino_win','sports_payout')), 0)::numeric(14,2),
    coalesce((select sum(l.amount) from l where l.kind in ('casino_refund','sports_refund')), 0)::numeric(14,2),
    coalesce((select sum(l.amount) from l where l.kind in ('casino_bet','casino_win','casino_refund','sports_stake','sports_payout','sports_refund')), 0)::numeric(14,2);
end $$;
revoke all on function public.my_annual_statement(int) from public, anon;
grant execute on function public.my_annual_statement(int) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. RTP de cada jogo (art. 4º, II)
-- -----------------------------------------------------------------------------
alter table public.games add column if not exists rtp numeric(5,2);
do $$ begin
  alter table public.games add constraint games_rtp_range check (rtp is null or (rtp > 0 and rtp <= 100));
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- 5. Gateway de teste (homologação): Pix simulado, sem dinheiro real.
--    Só funciona com dinheiro real desligado e o gateway "teste" ativo.
-- -----------------------------------------------------------------------------
alter table public.transactions
  add column if not exists is_test boolean not null default false,
  add column if not exists gateway text;

create or replace function public.guard_real_money()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_enabled boolean;
  v_gateway text;
  v_uid uuid := auth.uid();
begin
  if NEW.type::text not in ('deposit','withdrawal') then return NEW; end if;
  select coalesce((value #>> '{}')::boolean, false) into v_enabled from public.app_settings where key = 'real_money_enabled';

  -- Transação de teste nunca existe com dinheiro real ligado.
  if NEW.is_test and coalesce(v_enabled, false) then
    raise exception 'TEST_MONEY_DISABLED: dinheiro real ligado, transações de teste não são aceitas';
  end if;
  if TG_OP = 'UPDATE' and NEW.is_test is distinct from OLD.is_test then raise exception 'TRANSACTION_IMMUTABLE_FIELDS'; end if;

  if TG_OP = 'UPDATE' and not (NEW.status::text = 'approved' and OLD.status::text <> 'approved') then return NEW; end if;
  if coalesce(v_enabled, false) then return NEW; end if;
  if v_uid is not null and public.has_role(v_uid, 'admin') then return NEW; end if;
  if NEW.is_test then
    select value #>> '{}' into v_gateway from public.app_settings where key = 'active_gateway';
    if v_gateway = 'teste' then return NEW; end if;
  end if;
  raise exception 'REAL_MONEY_DISABLED: ambiente de homologação — depósitos e saques com dinheiro real estão desativados';
end $$;
revoke all on function public.guard_real_money() from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 6. Configurações novas e leitura pública das que o site precisa mostrar
-- -----------------------------------------------------------------------------
insert into public.app_settings (key, value) values
  ('terms_version', to_jsonb('2026-11-27'::text)),
  ('require_identity', 'true'::jsonb),
  ('support_email', to_jsonb(''::text)),
  ('support_whatsapp', to_jsonb(''::text)),
  ('support_hours', to_jsonb('Todos os dias, das 8h às 22h'::text)),
  ('ouvidoria_email', to_jsonb(''::text)),
  ('spa_authorization', to_jsonb(''::text)),
  ('company_name', to_jsonb(''::text)),
  ('company_cnpj', to_jsonb(''::text))
on conflict (key) do nothing;

drop policy if exists "public settings readable by authenticated" on public.app_settings;
drop policy if exists "public settings readable" on public.app_settings;
create policy "public settings readable" on public.app_settings for select to anon, authenticated
using (key = any (array[
  'min_deposit','max_deposit','min_withdraw','max_withdraw','withdrawal_fee_pct','maintenance_mode',
  'active_gateway','real_money_enabled','min_bet_sports','max_bet_sports','max_payout_sports',
  'casino_enabled','sports_enabled','signup_enabled','terms_version','require_identity',
  'support_email','support_whatsapp','support_hours','ouvidoria_email','spa_authorization',
  'company_name','company_cnpj'
]));
