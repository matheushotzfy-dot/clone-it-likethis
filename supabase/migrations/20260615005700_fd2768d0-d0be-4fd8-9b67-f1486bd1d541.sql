
-- 1. app_settings: restrict SELECT to admins. Server functions use service_role (supabaseAdmin) to expose safe values to clients.
DROP POLICY IF EXISTS "settings readable by authenticated" ON public.app_settings;
CREATE POLICY "settings readable by admin"
  ON public.app_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 2. profiles: extend tampering guard to block sensitive identity / tracking columns for non-admin self-updates.
CREATE OR REPLACE FUNCTION public.prevent_profile_tampering()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  IF v_uid IS NOT NULL THEN
    v_is_admin := public.has_role(v_uid, 'admin');
  END IF;
  IF v_uid IS NULL OR v_is_admin THEN
    RETURN NEW;
  END IF;
  IF NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.bonus_balance IS DISTINCT FROM OLD.bonus_balance
     OR NEW.bonus_used IS DISTINCT FROM OLD.bonus_used
     OR NEW.bonus_expires_at IS DISTINCT FROM OLD.bonus_expires_at
     OR NEW.kyc_status IS DISTINCT FROM OLD.kyc_status
     OR NEW.kyc_verified IS DISTINCT FROM OLD.kyc_verified
     OR NEW.is_frozen IS DISTINCT FROM OLD.is_frozen THEN
    RAISE EXCEPTION 'Não é permitido alterar saldo/bônus/kyc/congelamento diretamente';
  END IF;
  IF NEW.cpf IS DISTINCT FROM OLD.cpf
     OR NEW.signup_ip IS DISTINCT FROM OLD.signup_ip
     OR NEW.signup_user_agent IS DISTINCT FROM OLD.signup_user_agent
     OR NEW.referrer IS DISTINCT FROM OLD.referrer
     OR NEW.utm_source IS DISTINCT FROM OLD.utm_source
     OR NEW.utm_medium IS DISTINCT FROM OLD.utm_medium
     OR NEW.utm_campaign IS DISTINCT FROM OLD.utm_campaign
     OR NEW.utm_content IS DISTINCT FROM OLD.utm_content
     OR NEW.utm_term IS DISTINCT FROM OLD.utm_term
     OR NEW.fbp IS DISTINCT FROM OLD.fbp
     OR NEW.fbc IS DISTINCT FROM OLD.fbc THEN
    RAISE EXCEPTION 'Campos de identidade/tracking não podem ser alterados pelo usuário';
  END IF;
  RETURN NEW;
END $function$;

-- Ensure trigger is attached (idempotent)
DROP TRIGGER IF EXISTS prevent_profile_tampering_trg ON public.profiles;
CREATE TRIGGER prevent_profile_tampering_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_profile_tampering();
