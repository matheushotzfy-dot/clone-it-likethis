-- Aposta esportiva idempotente: o mesmo request_id do mesmo jogador devolve a aposta
-- já registrada em vez de criar outra (clique duplo, rede lenta, reenvio).
alter table public.sports_bets add column if not exists request_id text;
create unique index if not exists sports_bets_user_request_uidx
  on public.sports_bets (user_id, request_id) where request_id is not null;

drop function if exists public.place_sports_bet(uuid, text, text, text, text, text, timestamptz, text, numeric, numeric);

create or replace function public.place_sports_bet(
  p_user_id uuid, p_event_id text, p_league text, p_league_name text,
  p_home text, p_away text, p_starts_at timestamptz,
  p_pick text, p_odd numeric, p_stake numeric, p_request_id text default null
) returns table (bet_id uuid, balance numeric)
language plpgsql security definer set search_path = public as $$
declare
  v_id       uuid := gen_random_uuid();
  v_existing uuid;
  v_frozen   boolean;
  v_bal      numeric(14,2);
  v_stake    numeric(14,2) := round(p_stake, 2);
  v_odd      numeric(8,2)  := round(p_odd, 2);
begin
  if p_request_id is not null then
    select sb.id into v_existing from public.sports_bets sb
     where sb.user_id = p_user_id and sb.request_id = p_request_id;
    if found then
      return query select v_existing, (select pr.balance from public.profiles pr where pr.id = p_user_id);
      return;
    end if;
  end if;

  if v_stake is null or v_stake <= 0 then raise exception 'INVALID_STAKE'; end if;
  if v_odd is null or v_odd < 1.01 then raise exception 'INVALID_ODD'; end if;

  select coalesce(pr.is_frozen, false) into v_frozen from public.profiles pr where pr.id = p_user_id;
  if not found then raise exception 'USER_NOT_FOUND'; end if;
  if v_frozen then raise exception 'USER_FROZEN'; end if;
  perform public.rg_check(p_user_id, 'bet', v_stake);

  begin
    insert into public.sports_bets (id, user_id, event_id, league, league_name, home, away, starts_at,
      pick, odd, stake, potential_payout, request_id)
    values (v_id, p_user_id, p_event_id, p_league, p_league_name, p_home, p_away, p_starts_at,
      p_pick, v_odd, v_stake, round(v_stake * v_odd, 2), p_request_id);
  exception when unique_violation then
    -- Outro pedido igual entrou ao mesmo tempo: devolve o que ficou registrado.
    select sb.id into v_existing from public.sports_bets sb
     where sb.user_id = p_user_id and sb.request_id = p_request_id;
    return query select v_existing, (select pr.balance from public.profiles pr where pr.id = p_user_id);
    return;
  end;

  v_bal := public.wallet_apply(p_user_id, -v_stake, 'sports_stake', 'sb:' || v_id || ':stake',
    'sports_bets', v_id::text, p_home || ' x ' || p_away);

  return query select v_id, v_bal;
end $$;

revoke all on function public.place_sports_bet(uuid, text, text, text, text, text, timestamptz, text, numeric, numeric, text) from public, anon, authenticated;
grant execute on function public.place_sports_bet(uuid, text, text, text, text, text, timestamptz, text, numeric, numeric, text) to service_role;
