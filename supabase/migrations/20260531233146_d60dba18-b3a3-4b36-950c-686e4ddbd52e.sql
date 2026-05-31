CREATE TRIGGER force_pending_transaction_before_insert
BEFORE INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.force_pending_transaction();

CREATE TRIGGER apply_transaction_balance_after_insert
AFTER INSERT ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.apply_transaction_balance();

CREATE TRIGGER apply_transaction_balance_after_update
AFTER UPDATE OF status ON public.transactions
FOR EACH ROW
EXECUTE FUNCTION public.apply_transaction_balance();

CREATE TRIGGER prevent_profile_tampering_before_update
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_tampering();