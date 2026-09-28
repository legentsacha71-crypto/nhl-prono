-- Totaux de points par joueur, calculés dans la base : l'appli recevait
-- auparavant TOUS les pronostics notés à chaque affichage du classement
-- (~3,9 Mo par affichage prévu en fin de saison). Une ligne par joueur
-- (tous les profils, ou seulement p_user_ids pour une ligue).
--
-- NHL / Ligue Magnus : game_id < 1 000 000 = Ligue Magnus (voir
-- src/lib/competition.ts). Les picks Coupe Stanley / meilleur buteur
-- comptent dans le total NHL général (pas dans les semaines).
-- Semaines : un match compte selon son heure de début (game_start_time),
-- bornes [début, fin[ fournies par l'appli (heure de Paris, voir
-- src/lib/rankingWeek.ts). *_count = nombre de pronos notés dans la semaine
-- (un joueur n'apparaît dans le classement de la semaine que s'il est > 0).
--
-- security invoker : la fonction lit les tables avec les droits du joueur
-- connecté, les règles RLS existantes s'appliquent donc à l'identique.
--
-- À exécuter dans Supabase > SQL Editor (le code n'a pas de droit DDL).

create or replace function public.ranking_totals(
  p_last_week_start timestamptz default null,
  p_week_start timestamptz default null,
  p_week_end timestamptz default null,
  p_user_ids uuid[] default null
)
returns table (
  user_id uuid,
  username text,
  avatar_url text,
  nhl_points bigint,
  magnus_points bigint,
  week_nhl_points bigint,
  week_nhl_count bigint,
  week_magnus_points bigint,
  week_magnus_count bigint,
  last_week_nhl_points bigint,
  last_week_nhl_count bigint,
  last_week_magnus_points bigint,
  last_week_magnus_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with graded as (
    select
      p.user_id,
      p.points,
      p.game_id < 1000000 as is_magnus,
      p.game_start_time >= p_week_start and p.game_start_time < p_week_end as this_week,
      p.game_start_time >= p_last_week_start and p.game_start_time < p_week_start as last_week
    from predictions p
    where p.points is not null
      and (p_user_ids is null or p.user_id = any (p_user_ids))
  ),
  per_user as (
    select
      g.user_id,
      sum(g.points) filter (where not g.is_magnus) as nhl,
      sum(g.points) filter (where g.is_magnus) as magnus,
      sum(g.points) filter (where not g.is_magnus and g.this_week) as w_nhl,
      count(*) filter (where not g.is_magnus and g.this_week) as w_nhl_n,
      sum(g.points) filter (where g.is_magnus and g.this_week) as w_magnus,
      count(*) filter (where g.is_magnus and g.this_week) as w_magnus_n,
      sum(g.points) filter (where not g.is_magnus and g.last_week) as lw_nhl,
      count(*) filter (where not g.is_magnus and g.last_week) as lw_nhl_n,
      sum(g.points) filter (where g.is_magnus and g.last_week) as lw_magnus,
      count(*) filter (where g.is_magnus and g.last_week) as lw_magnus_n
    from graded g
    group by g.user_id
  ),
  bonus as (
    select b.user_id, sum(b.points) as pts
    from (
      select s.user_id, s.points from stanley_cup_picks s
      where s.points is not null
        and (p_user_ids is null or s.user_id = any (p_user_ids))
      union all
      select t.user_id, t.points from top_scorer_picks t
      where t.points is not null
        and (p_user_ids is null or t.user_id = any (p_user_ids))
    ) b
    group by b.user_id
  )
  select
    pr.id,
    pr.username,
    pr.avatar_url,
    coalesce(u.nhl, 0) + coalesce(b.pts, 0),
    coalesce(u.magnus, 0),
    coalesce(u.w_nhl, 0),
    coalesce(u.w_nhl_n, 0),
    coalesce(u.w_magnus, 0),
    coalesce(u.w_magnus_n, 0),
    coalesce(u.lw_nhl, 0),
    coalesce(u.lw_nhl_n, 0),
    coalesce(u.lw_magnus, 0),
    coalesce(u.lw_magnus_n, 0)
  from profiles pr
  left join per_user u on u.user_id = pr.id
  left join bonus b on b.user_id = pr.id
  where p_user_ids is null or pr.id = any (p_user_ids);
$$;

revoke execute on function public.ranking_totals(timestamptz, timestamptz, timestamptz, uuid[]) from public, anon;
grant execute on function public.ranking_totals(timestamptz, timestamptz, timestamptz, uuid[]) to authenticated, service_role;
