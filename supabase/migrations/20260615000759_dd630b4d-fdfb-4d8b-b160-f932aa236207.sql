DROP POLICY IF EXISTS "settings readable by all" ON public.app_settings;
CREATE POLICY "settings readable by authenticated" ON public.app_settings FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.app_settings FROM anon;