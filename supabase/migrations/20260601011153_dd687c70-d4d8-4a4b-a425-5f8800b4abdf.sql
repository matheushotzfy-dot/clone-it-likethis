-- Ad spend tracking
CREATE TABLE public.ad_spend (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  spend_date date NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  platform text NOT NULL DEFAULT 'meta',
  campaign text,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_spend TO authenticated;
GRANT ALL ON public.ad_spend TO service_role;
ALTER TABLE public.ad_spend ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ad_spend" ON public.ad_spend FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

-- Gateway reconciliation: real amount that hit the gateway + fees
CREATE TABLE public.gateway_reconciliation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_date date NOT NULL,
  real_amount numeric NOT NULL DEFAULT 0,
  fees numeric NOT NULL DEFAULT 0,
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gateway_reconciliation TO authenticated;
GRANT ALL ON public.gateway_reconciliation TO service_role;
ALTER TABLE public.gateway_reconciliation ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage gateway_recon" ON public.gateway_reconciliation FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));

CREATE INDEX idx_ad_spend_date ON public.ad_spend(spend_date DESC);
CREATE INDEX idx_gateway_recon_date ON public.gateway_reconciliation(ref_date DESC);