
-- Add bonus tracking and tracking metadata
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS bonus_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS bonus_used BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS signup_ip TEXT,
  ADD COLUMN IF NOT EXISTS signup_user_agent TEXT,
  ADD COLUMN IF NOT EXISTS utm_source TEXT,
  ADD COLUMN IF NOT EXISTS utm_medium TEXT,
  ADD COLUMN IF NOT EXISTS utm_campaign TEXT,
  ADD COLUMN IF NOT EXISTS utm_content TEXT,
  ADD COLUMN IF NOT EXISTS utm_term TEXT,
  ADD COLUMN IF NOT EXISTS fbp TEXT,
  ADD COLUMN IF NOT EXISTS fbc TEXT,
  ADD COLUMN IF NOT EXISTS referrer TEXT;

-- Save CPF/phone/tracking on signup, set 10-minute bonus window
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, username, full_name, cpf, phone,
    bonus_expires_at, bonus_used,
    signup_ip, signup_user_agent, referrer,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    fbp, fbc
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'cpf', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    now() + interval '10 minutes',
    false,
    NULLIF(NEW.raw_user_meta_data->>'signup_ip', ''),
    NULLIF(NEW.raw_user_meta_data->>'signup_user_agent', ''),
    NULLIF(NEW.raw_user_meta_data->>'referrer', ''),
    NULLIF(NEW.raw_user_meta_data->>'utm_source', ''),
    NULLIF(NEW.raw_user_meta_data->>'utm_medium', ''),
    NULLIF(NEW.raw_user_meta_data->>'utm_campaign', ''),
    NULLIF(NEW.raw_user_meta_data->>'utm_content', ''),
    NULLIF(NEW.raw_user_meta_data->>'utm_term', ''),
    NULLIF(NEW.raw_user_meta_data->>'fbp', ''),
    NULLIF(NEW.raw_user_meta_data->>'fbc', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

-- Ensure trigger on auth.users exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Apply bonus on first deposit approval inside 10-min window
CREATE OR REPLACE FUNCTION public.apply_transaction_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prof RECORD;
  v_bonus NUMERIC := 0;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NEW.type = 'deposit' THEN
      SELECT bonus_expires_at, bonus_used INTO v_prof FROM public.profiles WHERE id = NEW.user_id;
      IF v_prof.bonus_expires_at IS NOT NULL
         AND v_prof.bonus_used = false
         AND v_prof.bonus_expires_at > NEW.created_at THEN
        v_bonus := NEW.amount; -- 100% match, sem rollover
        UPDATE public.profiles
          SET balance = balance + NEW.amount + v_bonus,
              bonus_used = true,
              updated_at = now()
          WHERE id = NEW.user_id;
        INSERT INTO public.transactions (user_id, type, amount, status, description)
        VALUES (NEW.user_id, 'deposit', v_bonus, 'approved', 'Bônus 100% (10min, sem rollover)');
      ELSE
        UPDATE public.profiles SET balance = balance + NEW.amount WHERE id = NEW.user_id;
      END IF;
    ELSIF NEW.type = 'withdrawal' THEN
      UPDATE public.profiles SET balance = balance - NEW.amount WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for transactions
DROP TRIGGER IF EXISTS on_transaction_status_change ON public.transactions;
CREATE TRIGGER on_transaction_status_change
AFTER UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.apply_transaction_balance();
