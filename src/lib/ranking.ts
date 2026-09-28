import { SupabaseClient } from "@supabase/supabase-js";
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

type TotalsRow = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  nhl_points: number;
  magnus_points: number;
  week_nhl_points: number;
  week_nhl_count: number;
  week_magnus_points: number;
  week_magnus_count: number;
  last_week_nhl_points: number;
  last_week_nhl_count: number;
  last_week_magnus_points: number;
  last_week_magnus_count: number;
};

// Les totaux sont calculés dans la base (fonction ranking_totals, voir
// supabase/ranking_totals.sql) : une ligne par joueur, quel que soit le
// nombre de pronostics. Télécharger tous les pronostics notés pour les
// additionner ici aurait atteint ~4 Mo par affichage en fin de saison.
async function fetchTotals(
  supabase: SupabaseClient,
  { userIds, now }: { userIds?: string[]; now?: Date } = {}
): Promise<TotalsRow[]> {
  const week = now ? parisWeekBounds(now, 0) : null;
  const lastWeek = now ? parisWeekBounds(now, 1) : null;
  const { data, error } = await supabase.rpc("ranking_totals", {
    p_last_week_start: lastWeek?.start.toISOString() ?? null,
    p_week_start: week?.start.toISOString() ?? null,
    p_week_end: week?.end.toISOString() ?? null,
    p_user_ids: userIds ?? null,
  });
  if (error) {
    console.error("ranking_totals :", error.message);
    return [];
  }
  return (data ?? []) as TotalsRow[];
}

function toRanking(
  rows: TotalsRow[],
  points: (row: TotalsRow) => number,
  ringPoints?: (row: TotalsRow) => number
): RankingEntry[] {
  return rows
    .map((row) => ({
      userId: row.user_id,
      username: row.username,
      avatarUrl: row.avatar_url ?? null,
      totalPoints: Number(points(row)),
      ...(ringPoints ? { ringPoints: Number(ringPoints(row)) } : {}),
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);
}

// Total toutes compétitions confondues (profil, ligues, accueil).
export async function getRanking(
  supabase: SupabaseClient,
  userIds?: string[]
): Promise<RankingEntry[]> {
  const rows = await fetchTotals(supabase, { userIds });
  return toRanking(
    rows,
    (row) => Number(row.nhl_points) + Number(row.magnus_points)
  );
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

// Classement général par compétition (les picks Coupe Stanley / meilleur
// buteur comptent en NHL) + classements de la semaine en cours et de la
// précédente, où ne figurent que les joueurs ayant au moins un pronostic
// noté dans la semaine. Un seul appel à la base.
export async function getLeagueRankingsWithWeekly(
  supabase: SupabaseClient,
  now: Date = new Date()
): Promise<WeeklyRankings> {
  const rows = await fetchTotals(supabase, { now });
  const nhl = (row: TotalsRow) => row.nhl_points;
  const magnus = (row: TotalsRow) => row.magnus_points;

  return {
    general: { nhl: toRanking(rows, nhl), magnus: toRanking(rows, magnus) },
    week: {
      nhl: toRanking(
        rows.filter((r) => Number(r.week_nhl_count) > 0),
        (r) => r.week_nhl_points,
        nhl
      ),
      magnus: toRanking(
        rows.filter((r) => Number(r.week_magnus_count) > 0),
        (r) => r.week_magnus_points,
        magnus
      ),
    },
    weekBounds: parisWeekBounds(now, 0),
    lastWeek: {
      nhl: toRanking(
        rows.filter((r) => Number(r.last_week_nhl_count) > 0),
        (r) => r.last_week_nhl_points,
        nhl
      ),
      magnus: toRanking(
        rows.filter((r) => Number(r.last_week_magnus_count) > 0),
        (r) => r.last_week_magnus_points,
        magnus
      ),
    },
  };
}
