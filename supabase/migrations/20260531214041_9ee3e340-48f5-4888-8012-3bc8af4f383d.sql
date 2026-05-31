
-- Add is_frozen + helper view exposing has_deposited
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_frozen boolean NOT NULL DEFAULT false;

-- Update tampering trigger to allow admins to change is_frozen
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
     OR NEW.is_frozen IS DISTINCT FROM OLD.is_frozen THEN
    RAISE EXCEPTION 'Não é permitido alterar saldo/bônus/kyc/congelamento diretamente';
  END IF;
  RETURN NEW;
END $function$;

-- Banners table
CREATE TABLE IF NOT EXISTS public.banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  link_url text,
  sort_order int NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.banners TO anon, authenticated;
GRANT ALL ON public.banners TO service_role;
GRANT INSERT, UPDATE, DELETE ON public.banners TO authenticated;

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Banners visible to all" ON public.banners FOR SELECT USING (true);
CREATE POLICY "Admins manage banners ALL" ON public.banners
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket for banners (public)
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Banner files public read" ON storage.objects
  FOR SELECT USING (bucket_id = 'banners');
CREATE POLICY "Admins upload banner files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update banner files" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete banner files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'banners' AND public.has_role(auth.uid(), 'admin'));
