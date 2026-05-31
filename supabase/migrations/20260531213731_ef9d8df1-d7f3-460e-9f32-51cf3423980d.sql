
-- 1) Trigger that actually applies balance changes when transaction becomes approved
DROP TRIGGER IF EXISTS tx_apply_balance ON public.transactions;
CREATE TRIGGER tx_apply_balance
AFTER UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_transaction_balance();

-- 2) Prevent users from tampering with balance / bonus columns on profiles
CREATE OR REPLACE FUNCTION public.prevent_profile_tampering()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
BEGIN
  IF v_uid IS NOT NULL THEN
    v_is_admin := public.has_role(v_uid, 'admin');
  END IF;
  -- service_role / SECURITY DEFINER functions bypass auth.uid() (returns NULL) — allow
  IF v_uid IS NULL OR v_is_admin THEN
    RETURN NEW;
  END IF;
  IF NEW.balance IS DISTINCT FROM OLD.balance
     OR NEW.bonus_balance IS DISTINCT FROM OLD.bonus_balance
     OR NEW.bonus_used IS DISTINCT FROM OLD.bonus_used
     OR NEW.bonus_expires_at IS DISTINCT FROM OLD.bonus_expires_at
     OR NEW.kyc_status IS DISTINCT FROM OLD.kyc_status THEN
    RAISE EXCEPTION 'Não é permitido alterar saldo/bônus/kyc diretamente';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS profiles_prevent_tampering ON public.profiles;
CREATE TRIGGER profiles_prevent_tampering
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_tampering();

-- 3) Force pending status on transactions created by regular users
CREATE OR REPLACE FUNCTION public.force_pending_transaction()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NOT NULL AND NOT public.has_role(v_uid, 'admin') THEN
    NEW.status := 'pending';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS tx_force_pending ON public.transactions;
CREATE TRIGGER tx_force_pending
BEFORE INSERT ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.force_pending_transaction();

-- 4) Seed admin user admin@admin.com / 2milhoes
DO $$
DECLARE
  v_id uuid;
BEGIN
  SELECT id INTO v_id FROM auth.users WHERE email = 'admin@admin.com';
  IF v_id IS NULL THEN
    v_id := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token, is_super_admin
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
      'admin@admin.com', crypt('2milhoes', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Admin","username":"admin"}'::jsonb,
      now(), now(), '', '', '', '', false
    );
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      created_at, updated_at, last_sign_in_at
    ) VALUES (
      gen_random_uuid(), v_id,
      jsonb_build_object('sub', v_id::text, 'email', 'admin@admin.com'),
      'email', v_id::text, now(), now(), now()
    );
  ELSE
    -- ensure password matches
    UPDATE auth.users
       SET encrypted_password = crypt('2milhoes', gen_salt('bf')),
           email_confirmed_at = COALESCE(email_confirmed_at, now()),
           updated_at = now()
     WHERE id = v_id;
  END IF;

  -- ensure profile exists
  INSERT INTO public.profiles (id, username, full_name, bonus_used)
  VALUES (v_id, 'admin', 'Admin', true)
  ON CONFLICT (id) DO NOTHING;

  -- ensure admin role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
END $$;
