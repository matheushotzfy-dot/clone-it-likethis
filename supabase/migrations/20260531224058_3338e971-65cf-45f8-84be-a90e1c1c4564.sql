
-- Wire up missing triggers so admin approvals actually move money
-- and new signups get a profile row.

-- 1) Create profile + role on new auth user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2) Force non-admin inserts on transactions to status=pending
DROP TRIGGER IF EXISTS trg_force_pending_transaction ON public.transactions;
CREATE TRIGGER trg_force_pending_transaction
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.force_pending_transaction();

-- 3) When a transaction flips to approved, move balance (+ bonus on deposit)
DROP TRIGGER IF EXISTS trg_apply_transaction_balance ON public.transactions;
CREATE TRIGGER trg_apply_transaction_balance
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_transaction_balance();

-- Also fire on INSERT (admin manual adjustments insert directly as approved)
DROP TRIGGER IF EXISTS trg_apply_transaction_balance_insert ON public.transactions;
CREATE TRIGGER trg_apply_transaction_balance_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW
  WHEN (NEW.status = 'approved')
  EXECUTE FUNCTION public.apply_transaction_balance();

-- 4) Block non-admin users from tampering with balance/bonus/kyc/freeze
DROP TRIGGER IF EXISTS trg_prevent_profile_tampering ON public.profiles;
CREATE TRIGGER trg_prevent_profile_tampering
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_tampering();

-- 5) apply_transaction_balance currently only fires on OLD->approved transitions.
-- For the INSERT path we need it to also credit when OLD is NULL.
CREATE OR REPLACE FUNCTION public.apply_transaction_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_prof RECORD;
  v_bonus NUMERIC := 0;
  v_was_approved BOOLEAN := (TG_OP = 'UPDATE' AND OLD.status = 'approved');
BEGIN
  IF NEW.status = 'approved' AND NOT v_was_approved THEN
    IF NEW.type = 'deposit' THEN
      SELECT bonus_expires_at, bonus_used INTO v_prof FROM public.profiles WHERE id = NEW.user_id;
      IF v_prof.bonus_expires_at IS NOT NULL
         AND v_prof.bonus_used = false
         AND v_prof.bonus_expires_at > NEW.created_at
         AND NEW.description NOT ILIKE 'Ajuste manual%'
         AND NEW.description NOT ILIKE 'Bônus%' THEN
        v_bonus := NEW.amount;
        UPDATE public.profiles
          SET balance = balance + NEW.amount + v_bonus,
              bonus_used = true,
              updated_at = now()
          WHERE id = NEW.user_id;
        INSERT INTO public.transactions (user_id, type, amount, status, description)
        VALUES (NEW.user_id, 'deposit', v_bonus, 'approved', 'Bônus 100% (10min, sem rollover)');
      ELSE
        UPDATE public.profiles SET balance = balance + NEW.amount, updated_at = now() WHERE id = NEW.user_id;
      END IF;
    ELSIF NEW.type = 'withdrawal' THEN
      UPDATE public.profiles SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;
