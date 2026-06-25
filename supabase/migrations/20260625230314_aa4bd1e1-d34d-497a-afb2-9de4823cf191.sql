
CREATE OR REPLACE FUNCTION public.place_sports_bet(
  p_user_id uuid,
  p_stake numeric,
  p_odd numeric,
  p_match_id text,
  p_pick text,
  p_description text
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_is_frozen boolean;
BEGIN
  IF p_stake IS NULL OR p_stake <= 0 THEN
    RAISE EXCEPTION 'Valor de aposta inválido';
  END IF;
  IF p_odd IS NULL OR p_odd < 1.01 THEN
    RAISE EXCEPTION 'Odd inválida';
  END IF;

  SELECT balance, COALESCE(is_frozen,false) INTO v_balance, v_is_frozen
    FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_balance IS NULL THEN
    RAISE EXCEPTION 'Perfil não encontrado';
  END IF;
  IF v_is_frozen THEN
    RAISE EXCEPTION 'Conta congelada';
  END IF;
  IF v_balance < p_stake THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  UPDATE public.profiles
    SET balance = balance - p_stake, updated_at = now()
    WHERE id = p_user_id;

  INSERT INTO public.transactions(user_id, type, amount, status, description)
  VALUES (
    p_user_id, 'bet', p_stake, 'approved',
    COALESCE(p_description, 'Aposta esportiva')
      || ' | match=' || COALESCE(p_match_id,'') || ' | pick=' || COALESCE(p_pick,'')
      || ' | odd=' || p_odd::text
  );

  RETURN v_balance - p_stake;
END;
$$;
