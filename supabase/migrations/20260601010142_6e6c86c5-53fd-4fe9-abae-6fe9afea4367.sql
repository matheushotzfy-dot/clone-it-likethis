-- Prevent approving withdrawals that would make balance negative
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
  v_current_balance NUMERIC;
BEGIN
  IF NEW.description ILIKE 'Bônus%' THEN
    RETURN NEW;
  END IF;

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
        VALUES (NEW.user_id, 'bonus', v_bonus, 'approved', 'Bônus 100% (10min, sem rollover)');
      ELSE
        UPDATE public.profiles SET balance = balance + NEW.amount, updated_at = now() WHERE id = NEW.user_id;
      END IF;
    ELSIF NEW.type = 'withdrawal' THEN
      -- Lock the row and verify the balance can cover the withdrawal
      SELECT balance INTO v_current_balance FROM public.profiles WHERE id = NEW.user_id FOR UPDATE;
      IF v_current_balance IS NULL OR v_current_balance < NEW.amount THEN
        RAISE EXCEPTION 'Saldo insuficiente para aprovar este saque (saldo atual: %, saque: %)', v_current_balance, NEW.amount;
      END IF;
      UPDATE public.profiles SET balance = balance - NEW.amount, updated_at = now() WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;