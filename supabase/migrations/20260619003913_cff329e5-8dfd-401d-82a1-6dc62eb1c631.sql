CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base text;
  v_username text;
  v_suffix int := 0;
BEGIN
  v_base := COALESCE(NULLIF(NEW.raw_user_meta_data->>'username',''), split_part(NEW.email, '@', 1), 'user');
  v_base := regexp_replace(v_base, '[^a-zA-Z0-9_]', '', 'g');
  IF v_base = '' THEN v_base := 'user'; END IF;
  v_username := v_base;
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = v_username) LOOP
    v_suffix := v_suffix + 1;
    v_username := v_base || v_suffix::text;
    IF v_suffix > 50 THEN
      v_username := v_base || substr(replace(gen_random_uuid()::text,'-',''),1,8);
      EXIT;
    END IF;
  END LOOP;

  INSERT INTO public.profiles (
    id, username, full_name, cpf, phone,
    bonus_expires_at, bonus_used,
    signup_ip, signup_user_agent, referrer,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    fbp, fbc
  ) VALUES (
    NEW.id,
    v_username,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'cpf', ''),
    NULLIF(NEW.raw_user_meta_data->>'phone', ''),
    now() + interval '10 minutes',
    false,
    NULLIF(NEW.raw_user_meta_data->>'signup_ip', ''),
    NULLIF(NEW.raw_user_meta_data->>'signup_user_agent', ''),
    NULLIF(NEW.raw_user_meta_data->>'referrer', ''),
    NULLIF(NEW.raw_user_meta_data->>'utm_source', ''),
    NULLIF(NEW.raw_user_meta_data->>'utm_medium', ''),
    NULLIF(NEW.raw_user_meta_data->>'utm_campaign', ''),
    NULLIF(NEW.raw_user_meta_data->>'utm_content', ''),
    NULLIF(NEW.raw_user_meta_data->>'utm_term', ''),
    NULLIF(NEW.raw_user_meta_data->>'fbp', ''),
    NULLIF(NEW.raw_user_meta_data->>'fbc', '')
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Last-resort fallback: still create profile + role with a guaranteed-unique username so signup never fails
  INSERT INTO public.profiles (id, username, cpf, phone, bonus_expires_at, bonus_used)
  VALUES (
    NEW.id,
    'user_' || substr(replace(NEW.id::text,'-',''),1,12),
    NULLIF(NEW.raw_user_meta_data->>'cpf',''),
    NULLIF(NEW.raw_user_meta_data->>'phone',''),
    now() + interval '10 minutes',
    false
  ) ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;