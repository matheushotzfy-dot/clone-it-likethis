
CREATE TABLE public.game_rounds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  txn_id text NOT NULL UNIQUE,
  round_id text,
  provider text,
  game_code text,
  game_type text,
  txn_type text,
  bet numeric(12,2) NOT NULL DEFAULT 0,
  win numeric(12,2) NOT NULL DEFAULT 0,
  before_balance numeric(12,2),
  after_balance numeric(12,2),
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.game_rounds TO authenticated;
GRANT ALL ON public.game_rounds TO service_role;

ALTER TABLE public.game_rounds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own game rounds" ON public.game_rounds
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all game rounds" ON public.game_rounds
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_game_rounds_user ON public.game_rounds(user_id, created_at DESC);

CREATE OR REPLACE FUNCTION public.apply_playfivers_transaction(
  p_user_id uuid,
  p_txn_id text,
  p_round_id text,
  p_provider text,
  p_game_code text,
  p_game_type text,
  p_txn_type text,
  p_bet numeric,
  p_win numeric,
  p_payload jsonb
) RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
  v_before numeric;
  v_delta numeric;
  v_existing numeric;
BEGIN
  SELECT after_balance INTO v_existing FROM public.game_rounds WHERE txn_id = p_txn_id;
  IF FOUND THEN
    RETURN v_existing;
  END IF;

  SELECT balance INTO v_before FROM public.profiles WHERE id = p_user_id FOR UPDATE;
  IF v_before IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND';
  END IF;

  v_delta := COALESCE(p_win, 0) - COALESCE(p_bet, 0);

  IF v_before + v_delta < 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE';
  END IF;

  v_balance := v_before + v_delta;

  UPDATE public.profiles SET balance = v_balance, updated_at = now() WHERE id = p_user_id;

  INSERT INTO public.game_rounds(
    user_id, txn_id, round_id, provider, game_code, game_type, txn_type,
    bet, win, before_balance, after_balance, payload
  ) VALUES (
    p_user_id, p_txn_id, p_round_id, p_provider, p_game_code, p_game_type, p_txn_type,
    COALESCE(p_bet, 0), COALESCE(p_win, 0), v_before, v_balance, p_payload
  );

  IF COALESCE(p_bet, 0) > 0 THEN
    INSERT INTO public.transactions(user_id, type, amount, status, description)
    VALUES (p_user_id, 'bet', p_bet, 'approved',
            'Aposta ' || COALESCE(p_provider, '') || ' / ' || COALESCE(p_game_code, ''));
  END IF;
  IF COALESCE(p_win, 0) > 0 THEN
    INSERT INTO public.transactions(user_id, type, amount, status, description)
    VALUES (p_user_id, 'win', p_win, 'approved',
            'Ganho ' || COALESCE(p_provider, '') || ' / ' || COALESCE(p_game_code, ''));
  END IF;

  RETURN v_balance;
END $$;

GRANT EXECUTE ON FUNCTION public.apply_playfivers_transaction TO service_role;
