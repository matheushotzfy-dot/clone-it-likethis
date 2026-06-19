ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS gateway_qrcode text,
  ADD COLUMN IF NOT EXISTS gateway_external_id text;

UPDATE public.transactions
SET gateway_external_id = substring(description from 'SafePix PIX ([^[:space:]]+)')
WHERE type = 'deposit'
  AND gateway_external_id IS NULL
  AND description ILIKE 'SafePix PIX %'
  AND substring(description from 'SafePix PIX ([^[:space:]]+)') IS NOT NULL;

UPDATE public.transactions
SET status = 'rejected',
    description = COALESCE(description, 'SafePix PIX') || ' (expirado sem código PIX)'
WHERE type = 'deposit'
  AND status = 'pending'
  AND gateway_qrcode IS NULL
  AND created_at < now() - interval '20 minutes';

CREATE UNIQUE INDEX IF NOT EXISTS uniq_transactions_gateway_external_id
  ON public.transactions (gateway_external_id)
  WHERE gateway_external_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_transactions_one_pending_deposit_per_user
  ON public.transactions (user_id)
  WHERE type = 'deposit' AND status = 'pending';