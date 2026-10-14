import type { SupabaseClient } from "@supabase/supabase-js";
import { getGameResult } from "./gameResults";
import { isMagnusGameId } from "./competition";
import { nightAgeInDays, nightKey } from "./notificationFeed";

// Les meilleurs pronos de la dernière soirée jouée, tous joueurs confondus,
// pour la bande qui défile sur l'accueil.

export type TopPick = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  league: "nhl" | "magnus";
  homeAbbrev: string;
  awayAbbrev: string;
  homeScore: number;
  awayScore: number;
  predictedHome: number;
  predictedAway: number;
  points: number;
  isExactScore: boolean;
  boosted: boolean;
};

const MAX_PICKS = 10;
// Au plus deux pronos par joueur, pour varier les têtes.
const MAX_PER_PLAYER = 2;
// Au-delà, la soirée est trop ancienne pour être mise en avant.
const MAX_AGE_DAYS = 4;

type Row = {
  user_id: string;
  game_id: number;
  home_score: number;
  away_score: number;
  points: number;
  is_exact_score: boolean | null;
  boosted: boolean | null;
  game_start_time: string;
};

export async function getTopPicks(
  supabase: SupabaseClient,
  now: Date = new Date(),
): Promise<{ nightStart: string; picks: TopPick[] } | null> {
  const { data: latest } = await supabase
    .from("predictions")
    .select("game_start_time")
    .not("points", "is", null)
    .not("game_start_time", "is", null)
    .order("game_start_time", { ascending: false })
    .limit(1)
    .maybeSingle();
  const lastStart = latest?.game_start_time as string | undefined;
  if (!lastStart || nightAgeInDays(lastStart, now) > MAX_AGE_DAYS) return null;

  // Une soirée tient en moins de 30 h : on prend large puis on ne garde que
  // la dernière nuit (de midi à midi, heure de Paris).
  const windowStart = new Date(Date.parse(lastStart) - 30 * 60 * 60 * 1000).toISOString();
  const { data } = await supabase
    .from("predictions")
    .select("user_id, game_id, home_score, away_score, points, is_exact_score, boosted, game_start_time")
    .gt("points", 0)
    .gte("game_start_time", windowStart)
    .order("points", { ascending: false })
    .limit(200);

  const night = nightKey(lastStart);
  const perPlayer = new Map<string, number>();
  const best: Row[] = [];
  for (const row of (data ?? []) as Row[]) {
    if (nightKey(row.game_start_time) !== night) continue;
    const count = perPlayer.get(row.user_id) ?? 0;
    if (count >= MAX_PER_PLAYER) continue;
    perPlayer.set(row.user_id, count + 1);
    best.push(row);
    if (best.length === MAX_PICKS) break;
  }
  if (best.length === 0) return null;

  const gameIds = [...new Set(best.map((r) => r.game_id))];
  const [{ data: profiles }, results] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, avatar_url")
      .in("id", [...perPlayer.keys()]),
    Promise.all(
      gameIds.map((id) =>
        getGameResult(id, { settled: true })
          .then((result) => [id, result] as const)
          .catch(() => null),
      ),
    ),
  ]);
  const profileById = new Map((profiles ?? []).map((p) => [p.id as string, p]));
  const resultById = new Map(results.filter((r) => r !== null));

  const picks: TopPick[] = [];
  for (const row of best) {
    const result = resultById.get(row.game_id);
    const profile = profileById.get(row.user_id);
    if (!result?.homeAbbrev || !profile) continue;
    picks.push({
      userId: row.user_id,
      username: profile.username as string,
      avatarUrl: (profile.avatar_url as string | null) ?? null,
      league: isMagnusGameId(row.game_id) ? "magnus" : "nhl",
      homeAbbrev: result.homeAbbrev,
      awayAbbrev: result.awayAbbrev,
      homeScore: result.regulationHomeScore,
      awayScore: result.regulationAwayScore,
      predictedHome: row.home_score,
      predictedAway: row.away_score,
      points: row.points,
      isExactScore: Boolean(row.is_exact_score),
      boosted: Boolean(row.boosted),
    });
  }
  return picks.length > 0 ? { nightStart: lastStart, picks } : null;
}
