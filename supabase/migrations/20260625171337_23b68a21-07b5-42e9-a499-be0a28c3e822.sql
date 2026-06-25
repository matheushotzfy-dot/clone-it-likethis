UPDATE public.app_settings SET value = '3000'::jsonb WHERE key = 'max_deposit';
UPDATE public.app_settings SET value = '"veopag"'::jsonb WHERE key = 'active_gateway';