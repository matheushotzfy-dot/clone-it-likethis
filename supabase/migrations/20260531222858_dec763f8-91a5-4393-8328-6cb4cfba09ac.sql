-- 1. Add KYC columns to profiles and transactions
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS kyc_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kyc_submission_id uuid;

-- Allow admins to also toggle kyc_verified via the tampering trigger
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
  RETURN NEW;
END $function$;

-- 2. KYC submissions table
CREATE TYPE public.kyc_submission_status AS ENUM ('pending', 'approved', 'rejected');

CREATE TABLE public.kyc_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  transaction_id uuid,
  document_type text NOT NULL DEFAULT 'rg',  -- 'rg' | 'cnh'
  id_front_url text NOT NULL,
  id_back_url text,                          -- null when CNH
  residence_url text NOT NULL,
  selfie_url text NOT NULL,
  status public.kyc_submission_status NOT NULL DEFAULT 'pending',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

GRANT SELECT, INSERT ON public.kyc_submissions TO authenticated;
GRANT ALL ON public.kyc_submissions TO service_role;

ALTER TABLE public.kyc_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own kyc submissions"
  ON public.kyc_submissions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own kyc submissions"
  ON public.kyc_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all kyc submissions"
  ON public.kyc_submissions FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update kyc submissions"
  ON public.kyc_submissions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 3. Private storage bucket for KYC documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users upload own kyc docs"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users view own kyc docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Admins view all kyc docs"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'kyc-documents'
    AND public.has_role(auth.uid(), 'admin')
  );