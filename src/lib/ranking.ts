import { SupabaseClient } from "@supabase/supabase-js";
import { isMagnusGameId } from "./competition";
import { parisWeekBounds, type WeekBounds } from "./rankingWeek";

export type RankingEntry = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalPoints: number;
  // Points servant à choisir l'anneau de palier autour de l'avatar quand ils
  // diffèrent des points affichés (classement de la semaine : l'anneau
  // reflète le niveau général du joueur, pas ses points de la semaine).
  ringPoints?: number;
};

export type LeagueRankings = {
  nhl: RankingEntry[];
  magnus: RankingEntry[];
};

const PAGE_SIZE = 1000;

// PostgREST plafonne chaque réponse (1000 lignes par défaut) sans renvoyer
// d'erreur : sans pagination, le classement serait silencieusement tronqué
// dès qu'il y a plus de 1000 pronostics notés. La première page donne le
// total, les suivantes sont lues en parallèle (tri par id : pages stables).
async function fetchGradedPredictions(
  supabase: SupabaseClient,
  userIds?: string[],
) {
  const page = (from: number, to: number) => {
    let query = supabase
      .from("predictions")
      .select("user_id, game_id, points, game_start_time", { count: "exact" })
      .not("points", "is", null);
    if (userIds) query = query.in("user_id", userIds);
    return query.order("id").range(from, to);
  };

  const first = await page(0, PAGE_SIZE - 1);
  const rows = first.data ?? [];
  const total = first.count ?? rows.length;
  if (rows.length === 0 || rows.length >= total) return rows;

  const otherPages = await Promise.all(
    Array.from({ length: Math.ceil(total / PAGE_SIZE) - 1 }, (_, i) =>
      page((i + 1) * PAGE_SIZE, (i + 2) * PAGE_SIZE - 1),
    ),
  );
  return rows.concat(...otherPages.map((result) => result.data ?? []));
}

// Les lectures sont indépendantes : lancées en parallèle plutôt qu'à la suite
// (chaque requête séquentielle ajoutait un aller-retour réseau).
async function fetchRankingRows(supabase: SupabaseClient, userIds?: string[]) {
  let profilesQuery = supabase
    .from("profiles")
    .select("id, username, avatar_url");
  let stanleyCupQuery = supabase
    .from("stanley_cup_picks")
    .select("user_id, points")
    .not("points", "is", null);
  let topScorerQuery = supabase
    .from("top_scorer_picks")
    .select("user_id, points")
    .not("points", "is", null);

  if (userIds) {
    profilesQuery = profilesQuery.in("id", userIds);
    stanleyCupQuery = stanleyCupQuery.in("user_id", userIds);
    topScorerQuery = topScorerQuery.in("user_id", userIds);
  }

  const [profiles, predictions, stanleyCup, topScorer] = await Promise.all([
    profilesQuery,
    fetchGradedPredictions(supabase, userIds),
    stanleyCupQuery,
    topScorerQuery,
  ]);
  return [profiles, { data: predictions }, stanleyCup, topScorer] as const;
}

export async function getRanking(
  supabase: SupabaseClient,
  userIds?: string[],
): Promise<RankingEntry[]> {
  const [
    { data: profiles },
    { data: predictions },
    { data: stanleyCupPicks },
    { data: topScorerPicks },
  ] = await fetchRankingRows(supabase, userIds);

  const pointsByUser = new Map<string, number>();
  for (const p of predictions ?? []) {
    pointsByUser.set(
      p.user_id,
      (pointsByUser.get(p.user_id) ?? 0) + (p.points ?? 0),
    );
  }
  for (const p of [...(stanleyCupPicks ?? []), ...(topScorerPicks ?? [])]) {
    pointsByUser.set(
      p.user_id,
      (pointsByUser.get(p.user_id) ?? 0) + (p.points ?? 0),
    );
  }

  return (profiles ?? [])
    .map((profile) => ({
      userId: profile.id as string,
      username: profile.username as string,
      avatarUrl: (profile.avatar_url as string | null) ?? null,
      totalPoints: pointsByUser.get(profile.id) ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

type RankingRows = Awaited<ReturnType<typeof fetchRankingRows>>;
type Profile = { id: string; username: string; avatar_url: string | null };
type GradedPrediction = {
  user_id: string;
  game_id: number;
  points: number | null;
  game_start_time: string | null;
};

// Points par joueur et par compétition. Les picks bonus Coupe Stanley /
// Meilleur buteur sont des paris NHL, comptés dans le classement NHL — la
// Ligue Magnus n'a pas d'équivalent aujourd'hui.
function computeLeaguePoints([
  ,
  { data: predictions },
  { data: stanleyCupPicks },
  { data: topScorerPicks },
]: RankingRows) {
  const nhl = new Map<string, number>();
  const magnus = new Map<string, number>();
  for (const p of predictions ?? []) {
    const bucket = isMagnusGameId(p.game_id) ? magnus : nhl;
    bucket.set(p.user_id, (bucket.get(p.user_id) ?? 0) + (p.points ?? 0));
  }
  for (const p of [...(stanleyCupPicks ?? []), ...(topScorerPicks ?? [])]) {
    nhl.set(p.user_id, (nhl.get(p.user_id) ?? 0) + (p.points ?? 0));
  }
  return { nhl, magnus };
}

function buildRanking(
  profiles: Profile[],
  pointsByUser: Map<string, number>,
): RankingEntry[] {
  return profiles
    .map((profile) => ({
      userId: profile.id,
      username: profile.username,
      avatarUrl: profile.avatar_url ?? null,
      totalPoints: pointsByUser.get(profile.id) ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

// Classement séparé par compétition, pour l'onglet "Classement" (trop de
// matchs NHL noyaient la Ligue Magnus dans un classement unique).
export async function getLeagueRankings(
  supabase: SupabaseClient,
  userIds?: string[],
): Promise<LeagueRankings> {
  const rows = await fetchRankingRows(supabase, userIds);
  const profiles = (rows[0].data ?? []) as Profile[];
  const points = computeLeaguePoints(rows);
  return {
    nhl: buildRanking(profiles, points.nhl),
    magnus: buildRanking(profiles, points.magnus),
  };
}

// Classement d'une semaine : seuls les joueurs ayant eu au moins un pronostic
// noté sur les matchs de la période y figurent (un joueur à 0 point qui a
// pronostiqué apparaît ; un joueur absent cette semaine, non). Les matchs
// comptent selon leur heure de début, pas celle de la notation.
function buildWeeklyRankings(
  profiles: Profile[],
  predictions: GradedPrediction[],
  { start, end }: WeekBounds,
  ringPoints: { nhl: Map<string, number>; magnus: Map<string, number> },
): LeagueRankings {
  const nhl = new Map<string, number>();
  const magnus = new Map<string, number>();
  for (const p of predictions) {
    if (!p.game_start_time) continue;
    const startedAt = new Date(p.game_start_time).getTime();
    if (startedAt < start.getTime() || startedAt >= end.getTime()) continue;
    const bucket = isMagnusGameId(p.game_id) ? magnus : nhl;
    bucket.set(p.user_id, (bucket.get(p.user_id) ?? 0) + (p.points ?? 0));
  }

  const build = (
    weekly: Map<string, number>,
    ring: Map<string, number>,
  ): RankingEntry[] =>
    buildRanking(
      profiles.filter((profile) => weekly.has(profile.id)),
      weekly,
    ).map((entry) => ({ ...entry, ringPoints: ring.get(entry.userId) ?? 0 }));

  return { nhl: build(nhl, ringPoints.nhl), magnus: build(magnus, ringPoints.magnus) };
}

// Gagnant(s) d'un classement de semaine : le meilleur score, s'il est
// strictement positif (ex æquo : tous les joueurs à égalité, 3 au maximum).
export function weekWinners(ranking: RankingEntry[]): RankingEntry[] {
  const best = ranking[0]?.totalPoints ?? 0;
  if (best <= 0) return [];
  return ranking.filter((entry) => entry.totalPoints === best).slice(0, 3);
}

export type WeeklyRankings = {
  general: LeagueRankings;
  week: LeagueRankings;
  weekBounds: WeekBounds;
  lastWeek: LeagueRankings;
};

// Classement général + classement de la semaine en cours et de la
// précédente, calculés à partir des mêmes lectures (aucune requête en plus).
export async function getLeagueRankingsWithWeekly(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<WeeklyRankings> {
  const rows = await fetchRankingRows(supabase);
  const profiles = (rows[0].data ?? []) as Profile[];
  const predictions = (rows[1].data ?? []) as GradedPrediction[];
  const points = computeLeaguePoints(rows);
  const weekBounds = parisWeekBounds(now, 0);

  return {
    general: {
      nhl: buildRanking(profiles, points.nhl),
      magnus: buildRanking(profiles, points.magnus),
    },
    week: buildWeeklyRankings(profiles, predictions, weekBounds, points),
    weekBounds,
    lastWeek: buildWeeklyRankings(
      profiles,
      predictions,
      parisWeekBounds(now, 1),
      points,
    ),
  };
}
