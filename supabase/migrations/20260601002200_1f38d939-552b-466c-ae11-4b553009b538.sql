-- Remove triggers duplicados que estavam multiplicando saldos/bônus
DROP TRIGGER IF EXISTS on_transaction_status_change ON public.transactions;
DROP TRIGGER IF EXISTS tx_apply_balance ON public.transactions;
DROP TRIGGER IF EXISTS trg_apply_transaction_balance ON public.transactions;
DROP TRIGGER IF EXISTS trg_apply_transaction_balance_insert ON public.transactions;
DROP TRIGGER IF EXISTS apply_transaction_balance_after_insert ON public.transactions;
DROP TRIGGER IF EXISTS apply_transaction_balance_after_update ON public.transactions;

DROP TRIGGER IF EXISTS tx_force_pending ON public.transactions;
DROP TRIGGER IF EXISTS trg_force_pending_transaction ON public.transactions;
DROP TRIGGER IF EXISTS force_pending_transaction_before_insert ON public.transactions;

DROP TRIGGER IF EXISTS profiles_prevent_tampering ON public.profiles;
DROP TRIGGER IF EXISTS trg_prevent_profile_tampering ON public.profiles;
DROP TRIGGER IF EXISTS prevent_profile_tampering_before_update ON public.profiles;

-- Recria apenas um trigger canônico para cada propósito
CREATE TRIGGER force_pending_transaction_before_insert
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.force_pending_transaction();

CREATE TRIGGER apply_transaction_balance_after_insert
  AFTER INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_transaction_balance();

CREATE TRIGGER apply_transaction_balance_after_update
  AFTER UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_transaction_balance();

CREATE TRIGGER prevent_profile_tampering_before_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_tampering();