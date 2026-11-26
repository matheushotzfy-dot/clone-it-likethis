-- =============================================================================
-- Relatórios do painel admin (agregações no banco, só para admin)
-- Idempotente.
-- =============================================================================

-- Totais por jogador a partir do ledger + pagamentos.
create or replace view public.admin_player_summary
with (security_invoker = true) as
select
  p.id as user_id,
  p.username,
  p.full_name,
  p.cpf,
  p.phone,
  p.balance,
  p.is_frozen,
  p.created_at,
  p.last_seen_at,
  p.utm_source,
  p.utm_campaign,
  coalesce(l.deposits, 0)::numeric(14,2)      as deposits,
  coalesce(w.withdrawn, 0)::numeric(14,2)     as withdrawn,
  coalesce(w.pending, 0)::numeric(14,2)       as withdraw_pending,
  coalesce(l.casino_bets, 0)::numeric(14,2)   as casino_bets,
  coalesce(l.casino_wins, 0)::numeric(14,2)   as casino_wins,
  coalesce(l.sports_stakes, 0)::numeric(14,2) as sports_stakes,
  coalesce(l.sports_returns, 0)::numeric(14,2) as sports_returns,
  coalesce(l.adjustments, 0)::numeric(14,2)   as adjustments,
  (coalesce(l.casino_bets, 0) - coalesce(l.casino_wins, 0)
    + coalesce(l.sports_stakes, 0) - coalesce(l.sports_returns, 0))::numeric(14,2) as ggr,
  l.last_bet_at
from public.profiles p
left join lateral (
  select
    sum(amount) filter (where kind = 'deposit') as deposits,
    -sum(amount) filter (where kind = 'casino_bet') as casino_bets,
    sum(amount) filter (where kind in ('casino_win', 'casino_refund')) as casino_wins,
    -sum(amount) filter (where kind = 'sports_stake') as sports_stakes,
    sum(amount) filter (where kind in ('sports_payout', 'sports_refund')) as sports_returns,
    sum(amount) filter (where kind = 'adjustment') as adjustments,
    max(created_at) filter (where kind in ('casino_bet', 'sports_stake')) as last_bet_at
  from public.wallet_ledger wl where wl.user_id = p.id
) l on true
left join lateral (
  select
    sum(amount) filter (where status = 'approved') as withdrawn,
    sum(amount) filter (where status = 'pending') as pending
  from public.transactions t where t.user_id = p.id and t.type = 'withdrawal'
) w on true;

grant select on public.admin_player_summary to authenticated;

-- Números por dia (fuso de São Paulo) para o painel e o financeiro.
create or replace function public.admin_daily_stats(p_days int)
returns table (
  day date,
  deposits numeric, deposits_count int,
  withdrawals numeric, withdrawals_count int,
  casino_bets numeric, casino_wins numeric,
  sports_stakes numeric, sports_returns numeric,
  adjustments numeric,
  signups int, depositors int, active_players int
)
language plpgsql stable security definer set search_path = public as $$
declare
  v_start date := (now() at time zone 'America/Sao_Paulo')::date - (greatest(p_days, 1) - 1);
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  return query
  with days as (
    select generate_series(v_start, (now() at time zone 'America/Sao_Paulo')::date, interval '1 day')::date as d
  ),
  led as (
    select (created_at at time zone 'America/Sao_Paulo')::date as d, kind, amount, user_id
    from public.wallet_ledger
    where created_at >= (v_start::timestamp at time zone 'America/Sao_Paulo')
  ),
  wd as (
    select (created_at at time zone 'America/Sao_Paulo')::date as d, amount
    from public.transactions
    where type = 'withdrawal' and status = 'approved'
      and created_at >= (v_start::timestamp at time zone 'America/Sao_Paulo')
  ),
  su as (
    select (created_at at time zone 'America/Sao_Paulo')::date as d, count(*)::int as n
    from public.profiles
    where created_at >= (v_start::timestamp at time zone 'America/Sao_Paulo')
    group by 1
  )
  select
    days.d,
    coalesce(sum(led.amount) filter (where led.kind = 'deposit'), 0)::numeric(14,2),
    coalesce(count(*) filter (where led.kind = 'deposit'), 0)::int,
    coalesce((select sum(wd.amount) from wd where wd.d = days.d), 0)::numeric(14,2),
    coalesce((select count(*) from wd where wd.d = days.d), 0)::int,
    coalesce(-sum(led.amount) filter (where led.kind = 'casino_bet'), 0)::numeric(14,2),
    coalesce(sum(led.amount) filter (where led.kind in ('casino_win', 'casino_refund')), 0)::numeric(14,2),
    coalesce(-sum(led.amount) filter (where led.kind = 'sports_stake'), 0)::numeric(14,2),
    coalesce(sum(led.amount) filter (where led.kind in ('sports_payout', 'sports_refund')), 0)::numeric(14,2),
    coalesce(sum(led.amount) filter (where led.kind = 'adjustment'), 0)::numeric(14,2),
    coalesce((select su.n from su where su.d = days.d), 0)::int,
    coalesce(count(distinct led.user_id) filter (where led.kind = 'deposit'), 0)::int,
    coalesce(count(distinct led.user_id) filter (where led.kind in ('casino_bet', 'sports_stake')), 0)::int
  from days
  left join led on led.d = days.d
  group by days.d
  order by days.d;
end $$;

-- Jogos com mais movimento num período.
create or replace function public.admin_game_stats(p_days int, p_limit int default 20)
returns table (provider text, game_code text, game_name text, rounds bigint, players bigint, bets numeric, wins numeric, ggr numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  return query
  select r.provider, r.game_code, max(g.name),
         count(*), count(distinct r.user_id),
         sum(r.bet)::numeric(14,2), sum(r.win)::numeric(14,2), (sum(r.bet) - sum(r.win))::numeric(14,2)
  from public.game_rounds r
  left join public.games g on g.game_code = r.game_code
  where r.created_at >= now() - make_interval(days => greatest(p_days, 1)) and r.status = 'settled'
  group by r.provider, r.game_code
  order by sum(r.bet) desc
  limit greatest(p_limit, 1);
end $$;

-- Exposição das apostas esportivas abertas por jogo.
create or replace function public.admin_sports_exposure()
returns table (event_id text, league_name text, home text, away text, starts_at timestamptz,
               bets bigint, stakes numeric, payout_home numeric, payout_draw numeric, payout_away numeric)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then raise exception 'FORBIDDEN'; end if;
  return query
  select b.event_id, max(b.league_name), max(b.home), max(b.away), max(b.starts_at),
         count(*), sum(b.stake)::numeric(14,2),
         coalesce(sum(b.potential_payout) filter (where b.pick = 'home'), 0)::numeric(14,2),
         coalesce(sum(b.potential_payout) filter (where b.pick = 'draw'), 0)::numeric(14,2),
         coalesce(sum(b.potential_payout) filter (where b.pick = 'away'), 0)::numeric(14,2)
  from public.sports_bets b
  where b.status = 'open'
  group by b.event_id
  order by max(b.starts_at);
end $$;

revoke all on function public.admin_daily_stats(int) from public, anon;
grant execute on function public.admin_daily_stats(int) to authenticated;
revoke all on function public.admin_game_stats(int, int) from public, anon;
grant execute on function public.admin_game_stats(int, int) to authenticated;
revoke all on function public.admin_sports_exposure() from public, anon;
grant execute on function public.admin_sports_exposure() to authenticated;

-- last_seen_at: atualizado pelo próprio jogador (só esse campo, via função).
create or replace function public.touch_last_seen()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_seen_at = now()
   where id = auth.uid() and (last_seen_at is null or last_seen_at < now() - interval '5 minutes');
$$;
revoke all on function public.touch_last_seen() from public, anon;
grant execute on function public.touch_last_seen() to authenticated;
