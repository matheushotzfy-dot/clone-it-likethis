CREATE OR REPLACE FUNCTION public.apply_transaction_balance()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_was_approved BOOLEAN := (TG_OP = 'UPDATE' AND OLD.status = 'approved');
  v_current_balance NUMERIC;
BEGIN
  IF NEW.description ILIKE 'Bônus%' THEN
    RETURN NEW;
  END IF;
  IF NEW.status = 'approved' AND NOT v_was_approved THEN
    IF NEW.type = 'deposit' THEN
      -- Credit exactly the paid amount; no bonus.
      UPDATE public.profiles SET balance = balance + NEW.amount, updated_at = now() WHERE id = NEW.user_id;
    ELSIF NEW.type = 'withdrawal' THEN
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

INSERT INTO public.app_settings(key, value) VALUES ('welcome_bonus', '0'::jsonb), ('active_gateway', '"veopag"'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();