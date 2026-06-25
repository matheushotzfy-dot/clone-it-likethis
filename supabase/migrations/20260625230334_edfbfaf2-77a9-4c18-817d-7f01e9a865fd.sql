
REVOKE EXECUTE ON FUNCTION public.place_sports_bet(uuid,numeric,numeric,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_sports_bet(uuid,numeric,numeric,text,text,text) TO authenticated, service_role;
