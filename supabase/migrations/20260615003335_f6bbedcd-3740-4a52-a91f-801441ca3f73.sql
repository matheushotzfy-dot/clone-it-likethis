
CREATE TABLE public.gateway_credentials (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gateway_credentials TO authenticated;
GRANT ALL ON public.gateway_credentials TO service_role;

ALTER TABLE public.gateway_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin read gateway credentials"
  ON public.gateway_credentials FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin write gateway credentials"
  ON public.gateway_credentials FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
