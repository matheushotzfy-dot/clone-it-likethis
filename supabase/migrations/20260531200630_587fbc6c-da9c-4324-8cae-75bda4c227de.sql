
-- Settings table (singleton key/value)
CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.app_settings TO authenticated, anon;
GRANT ALL ON public.app_settings TO service_role;

ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "settings readable by all"
  ON public.app_settings FOR SELECT
  USING (true);

CREATE POLICY "settings updatable by admin"
  ON public.app_settings FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed defaults
INSERT INTO public.app_settings (key, value) VALUES
  ('min_deposit', '20'::jsonb),
  ('max_deposit', '10000'::jsonb),
  ('min_withdraw', '50'::jsonb),
  ('max_withdraw', '5000'::jsonb),
  ('withdrawal_fee_pct', '0'::jsonb),
  ('welcome_bonus', '0'::jsonb),
  ('maintenance_mode', 'false'::jsonb);

-- Ensure transaction_status enum has needed values (approved/rejected)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'approved' AND enumtypid = 'transaction_status'::regtype) THEN
    ALTER TYPE transaction_status ADD VALUE 'approved';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'rejected' AND enumtypid = 'transaction_status'::regtype) THEN
    ALTER TYPE transaction_status ADD VALUE 'rejected';
  END IF;
EXCEPTION WHEN undefined_object THEN
  -- type doesn't exist, create it
  CREATE TYPE transaction_status AS ENUM ('pending','approved','rejected','completed','failed');
END $$;

-- Admin RLS additions for transactions & profiles
CREATE POLICY "Admins view all transactions"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update transactions"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Allow self-insert on profiles (handled by trigger, but allow upsert too)
CREATE POLICY "Users insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Approval trigger: when transaction goes from pending -> approved, adjust balance
CREATE OR REPLACE FUNCTION public.apply_transaction_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM 'approved' THEN
    IF NEW.type = 'deposit' THEN
      UPDATE public.profiles SET balance = balance + NEW.amount WHERE id = NEW.user_id;
    ELSIF NEW.type = 'withdrawal' THEN
      UPDATE public.profiles SET balance = balance - NEW.amount WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_apply_transaction_balance ON public.transactions;
CREATE TRIGGER trg_apply_transaction_balance
  AFTER UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_transaction_balance();

-- Auth trigger to auto-create profile on signup (if not present)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
