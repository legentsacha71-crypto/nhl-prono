import { SupabaseClient } from "@supabase/supabase-js";
import { isMagnusGameId } from "./competition";

export type RankingEntry = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  totalPoints: number;
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
      .select("user_id, game_id, points", { count: "exact" })
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

// Classement séparé par compétition, pour l'onglet "Classement" (trop de
// matchs NHL noyaient la Ligue Magnus dans un classement unique). Les picks
// bonus Coupe Stanley / Meilleur buteur sont des paris NHL, comptés dans le
// classement NHL — la Ligue Magnus n'a pas d'équivalent aujourd'hui.
export async function getLeagueRankings(
  supabase: SupabaseClient,
  userIds?: string[],
): Promise<LeagueRankings> {
  const [
    { data: profiles },
    { data: predictions },
    { data: stanleyCupPicks },
    { data: topScorerPicks },
  ] = await fetchRankingRows(supabase, userIds);

  const nhlPointsByUser = new Map<string, number>();
  const magnusPointsByUser = new Map<string, number>();
  for (const p of predictions ?? []) {
    const bucket = isMagnusGameId(p.game_id)
      ? magnusPointsByUser
      : nhlPointsByUser;
    bucket.set(p.user_id, (bucket.get(p.user_id) ?? 0) + (p.points ?? 0));
  }
  for (const p of [...(stanleyCupPicks ?? []), ...(topScorerPicks ?? [])]) {
    nhlPointsByUser.set(
      p.user_id,
      (nhlPointsByUser.get(p.user_id) ?? 0) + (p.points ?? 0),
    );
  }

  const buildRanking = (pointsByUser: Map<string, number>): RankingEntry[] =>
    (profiles ?? [])
      .map((profile) => ({
        userId: profile.id as string,
        username: profile.username as string,
        avatarUrl: (profile.avatar_url as string | null) ?? null,
        totalPoints: pointsByUser.get(profile.id) ?? 0,
      }))
      .sort((a, b) => b.totalPoints - a.totalPoints);

  return {
    nhl: buildRanking(nhlPointsByUser),
    magnus: buildRanking(magnusPointsByUser),
  };
}
