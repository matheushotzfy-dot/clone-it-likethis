-- Lobby: provedores com contagem e capas, e mais jogados da semana, agregados no banco
-- (a API REST corta em 1000 linhas, então somar no servidor dava número errado).

drop function if exists public.lobby_providers();
create or replace function public.lobby_providers(p_category text default null)
returns table (provider text, games bigint, covers text[])
language sql stable security invoker set search_path = public as $$
  select g.provider,
         count(*) as games,
         (array_agg(g.image_url order by g.featured desc, g.sort_order asc, g.name asc)
            filter (where g.image_url is not null))[1:3] as covers
  from public.games g
  where g.active
    and (p_category is null
         or (p_category = 'live' and g.category in ('live', 'table'))
         or g.category = p_category)
  group by g.provider
  order by count(*) desc, g.provider asc;
$$;
revoke all on function public.lobby_providers(text) from public;
grant execute on function public.lobby_providers(text) to anon, authenticated, service_role;

create or replace function public.lobby_top_games(p_days int default 7, p_limit int default 30)
returns table (game_id bigint, rounds bigint, players bigint)
language sql stable security definer set search_path = public as $$
  select g.id::bigint, count(*) as rounds, count(distinct r.user_id) as players
  from public.game_rounds r
  join public.games g on g.game_code = r.game_code and g.active
  where r.created_at >= now() - make_interval(days => greatest(least(p_days, 90), 1))
    and r.bet > 0
  group by g.id
  order by count(distinct r.user_id) desc, count(*) desc
  limit greatest(least(p_limit, 100), 1);
$$;
revoke all on function public.lobby_top_games(int, int) from public, anon, authenticated;
grant execute on function public.lobby_top_games(int, int) to service_role;
