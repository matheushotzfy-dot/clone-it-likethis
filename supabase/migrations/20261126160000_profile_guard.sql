-- Conta antiga sem CPF/nascimento: o jogador só pode preencher uma vez, com CPF válido,
-- sem outra conta usando e com 18 anos ou mais (mesmas regras do cadastro).
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
     or NEW.freeze_reason is distinct from OLD.freeze_reason
     or NEW.created_at is distinct from OLD.created_at then
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
    if not public.is_valid_cpf(NEW.cpf) then
      raise exception 'SIGNUP_INVALID_CPF';
    end if;
    if exists (select 1 from public.profiles p where p.cpf = NEW.cpf and p.id <> NEW.id) then
      raise exception 'SIGNUP_CPF_TAKEN';
    end if;
  end if;

  if OLD.birth_date is null and NEW.birth_date is not null then
    if NEW.birth_date > (current_date - interval '18 years')::date
       or NEW.birth_date < date '1900-01-01' then
      raise exception 'SIGNUP_UNDERAGE';
    end if;
  end if;
  return NEW;
end $$;
revoke all on function public.prevent_profile_tampering() from public, anon, authenticated;
