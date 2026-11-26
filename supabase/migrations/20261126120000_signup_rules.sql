-- =============================================================================
-- Regras de cadastro aplicadas no banco (valem até para quem chamar a API do
-- Supabase direto): CPF válido e sem conta, maior de 18 anos, cadastro aberto.
-- Idempotente.
-- =============================================================================

create or replace function public.is_valid_cpf(p_cpf text)
returns boolean language plpgsql immutable as $$
declare
  d text := regexp_replace(coalesce(p_cpf, ''), '\D', '', 'g');
  s int;
  r int;
  i int;
begin
  if length(d) <> 11 or d ~ '^(\d)\1{10}$' then return false; end if;
  s := 0;
  for i in 1..9 loop s := s + substr(d, i, 1)::int * (11 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if;
  if r <> substr(d, 10, 1)::int then return false; end if;
  s := 0;
  for i in 1..10 loop s := s + substr(d, i, 1)::int * (12 - i); end loop;
  r := (s * 10) % 11; if r = 10 then r := 0; end if;
  return r = substr(d, 11, 1)::int;
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_base     text;
  v_username text;
  v_suffix   int := 0;
  v_birth    date;
  v_cpf      text := nullif(regexp_replace(coalesce(NEW.raw_user_meta_data->>'cpf', ''), '\D', '', 'g'), '');
  v_open     boolean;
  v_admin_created boolean := coalesce((NEW.raw_app_meta_data->>'created_by_admin')::boolean, false);
begin
  -- Validação primeiro e fora do bloco de fallback: cadastro inválido não entra.
  if not v_admin_created then
    select coalesce((value #>> '{}')::boolean, true) into v_open from public.app_settings where key = 'signup_enabled';
    if v_open is false then raise exception 'SIGNUP_CLOSED'; end if;

    if v_cpf is null or not public.is_valid_cpf(v_cpf) then raise exception 'SIGNUP_CPF_INVALID'; end if;
    if exists (select 1 from public.profiles where cpf = v_cpf) then raise exception 'SIGNUP_CPF_TAKEN'; end if;

    begin
      v_birth := nullif(NEW.raw_user_meta_data->>'birth_date', '')::date;
    exception when others then
      v_birth := null;
    end;
    if v_birth is null then raise exception 'SIGNUP_BIRTHDATE_REQUIRED'; end if;
    if v_birth > (now() at time zone 'America/Sao_Paulo')::date - interval '18 years' then raise exception 'SIGNUP_UNDERAGE'; end if;
    if v_birth < date '1900-01-01' then raise exception 'SIGNUP_BIRTHDATE_INVALID'; end if;
  end if;

  v_base := coalesce(nullif(NEW.raw_user_meta_data->>'username', ''), split_part(NEW.email, '@', 1), 'user');
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
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    fbp, fbc
  ) values (
    NEW.id, v_username,
    left(trim(coalesce(NEW.raw_user_meta_data->>'full_name', '')), 120),
    v_cpf,
    nullif(regexp_replace(coalesce(NEW.raw_user_meta_data->>'phone', ''), '\D', '', 'g'), ''),
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
  insert into public.user_roles (user_id, role) values (NEW.id, 'user') on conflict do nothing;
  return NEW;
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_valid_cpf(text) from public, anon;
grant execute on function public.is_valid_cpf(text) to authenticated, service_role;
