DROP POLICY IF EXISTS "settings readable by all authenticated" ON public.app_settings;
CREATE POLICY "public settings readable by authenticated" ON public.app_settings FOR SELECT TO authenticated
USING (key IN ('min_deposit','max_deposit','min_withdraw','max_withdraw','withdrawal_fee_pct','welcome_bonus','maintenance_mode','active_gateway'));