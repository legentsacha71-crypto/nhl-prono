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

export async function getRanking(
  supabase: SupabaseClient,
  userIds?: string[],
): Promise<RankingEntry[]> {
  let profilesQuery = supabase
    .from("profiles")
    .select("id, username, avatar_url");
  if (userIds) {
    profilesQuery = profilesQuery.in("id", userIds);
  }
  const { data: profiles } = await profilesQuery;

  let predictionsQuery = supabase
    .from("predictions")
    .select("user_id, points")
    .not("points", "is", null);
  if (userIds) {
    predictionsQuery = predictionsQuery.in("user_id", userIds);
  }
  const { data: predictions } = await predictionsQuery;

  const pointsByUser = new Map<string, number>();
  for (const p of predictions ?? []) {
    pointsByUser.set(
      p.user_id,
      (pointsByUser.get(p.user_id) ?? 0) + (p.points ?? 0),
    );
  }

  let stanleyCupQuery = supabase
    .from("stanley_cup_picks")
    .select("user_id, points")
    .not("points", "is", null);
  if (userIds) {
    stanleyCupQuery = stanleyCupQuery.in("user_id", userIds);
  }
  const { data: stanleyCupPicks } = await stanleyCupQuery;

  for (const p of stanleyCupPicks ?? []) {
    pointsByUser.set(
      p.user_id,
      (pointsByUser.get(p.user_id) ?? 0) + (p.points ?? 0),
    );
  }

  let topScorerQuery = supabase
    .from("top_scorer_picks")
    .select("user_id, points")
    .not("points", "is", null);
  if (userIds) {
    topScorerQuery = topScorerQuery.in("user_id", userIds);
  }
  const { data: topScorerPicks } = await topScorerQuery;

  for (const p of topScorerPicks ?? []) {
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
  let profilesQuery = supabase
    .from("profiles")
    .select("id, username, avatar_url");
  if (userIds) {
    profilesQuery = profilesQuery.in("id", userIds);
  }
  const { data: profiles } = await profilesQuery;

  let predictionsQuery = supabase
    .from("predictions")
    .select("user_id, game_id, points")
    .not("points", "is", null);
  if (userIds) {
    predictionsQuery = predictionsQuery.in("user_id", userIds);
  }
  const { data: predictions } = await predictionsQuery;

  const nhlPointsByUser = new Map<string, number>();
  const magnusPointsByUser = new Map<string, number>();
  for (const p of predictions ?? []) {
    const bucket = isMagnusGameId(p.game_id)
      ? magnusPointsByUser
      : nhlPointsByUser;
    bucket.set(p.user_id, (bucket.get(p.user_id) ?? 0) + (p.points ?? 0));
  }

  let stanleyCupQuery = supabase
    .from("stanley_cup_picks")
    .select("user_id, points")
    .not("points", "is", null);
  if (userIds) {
    stanleyCupQuery = stanleyCupQuery.in("user_id", userIds);
  }
  const { data: stanleyCupPicks } = await stanleyCupQuery;

  for (const p of stanleyCupPicks ?? []) {
    nhlPointsByUser.set(
      p.user_id,
      (nhlPointsByUser.get(p.user_id) ?? 0) + (p.points ?? 0),
    );
  }

  let topScorerQuery = supabase
    .from("top_scorer_picks")
    .select("user_id, points")
    .not("points", "is", null);
  if (userIds) {
    topScorerQuery = topScorerQuery.in("user_id", userIds);
  }
  const { data: topScorerPicks } = await topScorerQuery;

  for (const p of topScorerPicks ?? []) {
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
