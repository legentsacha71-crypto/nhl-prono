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
// `range` remplace la semaine en cours par une autre période (ligues :
// depuis leur création) ; les colonnes week_* portent alors sur elle.
async function fetchTotals(
  supabase: SupabaseClient,
  {
    userIds,
    now,
    range,
  }: { userIds?: string[]; now?: Date; range?: WeekBounds } = {}
): Promise<TotalsRow[]> {
  const week = range ?? (now ? parisWeekBounds(now, 0) : null);
  const lastWeek = !range && now ? parisWeekBounds(now, 1) : null;
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

const FAR_FUTURE = new Date("2100-01-01T00:00:00Z");

// Bonus de saison (Coupe Stanley, meilleur buteur), attribués en fin de
// saison : ils comptent aussi dans les ligues.
async function seasonBonus(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, number>> {
  const bonus = new Map<string, number>();
  if (userIds.length === 0) return bonus;
  const results = await Promise.all(
    ["stanley_cup_picks", "top_scorer_picks"].map((table) =>
      supabase
        .from(table)
        .select("user_id, points")
        .in("user_id", userIds)
        .not("points", "is", null)
    )
  );
  for (const { data } of results) {
    for (const row of data ?? []) {
      bonus.set(row.user_id, (bonus.get(row.user_id) ?? 0) + Number(row.points));
    }
  }
  return bonus;
}

const seasonTotal = (row: TotalsRow) =>
  Number(row.nhl_points) + Number(row.magnus_points);

export type Competition = "nhl" | "magnus";

// Colonnes de la période (création de la ligue → maintenant, ou semaine)
// pour une compétition.
function rangePoints(row: TotalsRow, competition: Competition): number {
  return Number(competition === "nhl" ? row.week_nhl_points : row.week_magnus_points);
}
function rangeCount(row: TotalsRow, competition: Competition): number {
  return Number(competition === "nhl" ? row.week_nhl_count : row.week_magnus_count);
}

export type LeagueCompetitionRankings = Record<
  Competition,
  {
    // Membres qui jouent dans cette compétition, classés.
    ranking: RankingEntry[];
    // Membres qui n'y ont jamais parié : listés à part, pas classés à 0.
    notPlaying: RankingEntry[];
  }
>;

// Classement d'une ligue, séparé NHL / Ligue Magnus (certains ne parient
// que sur l'une des deux). Seuls comptent les matchs joués depuis la
// création de la ligue : tout le monde y repart de 0, y compris ceux qui la
// rejoignent plus tard. Les bonus de saison (Coupe Stanley, meilleur
// buteur) comptent en NHL. L'anneau de l'avatar reste celui des points de
// toute la saison.
export async function getLeagueCompetitionRankings(
  supabase: SupabaseClient,
  userIds: string[],
  since: Date
): Promise<LeagueCompetitionRankings> {
  const [rows, bonus] = await Promise.all([
    fetchTotals(supabase, { userIds, range: { start: since, end: FAR_FUTURE } }),
    seasonBonus(supabase, userIds),
  ]);
  const build = (competition: Competition) => {
    const bonusOf = (row: TotalsRow) =>
      competition === "nhl" ? bonus.get(row.user_id) ?? 0 : 0;
    // Joue dans la compétition : un prono noté depuis la création de la
    // ligue, ou des points dans cette compétition sur la saison.
    const plays = (row: TotalsRow) =>
      rangeCount(row, competition) > 0 ||
      Number(competition === "nhl" ? row.nhl_points : row.magnus_points) > 0;
    return {
      ranking: toRanking(
        rows.filter(plays),
        (row) => rangePoints(row, competition) + bonusOf(row),
        seasonTotal
      ),
      notPlaying: toRanking(
        rows.filter((row) => !plays(row)),
        () => 0,
        seasonTotal
      ),
    };
  };
  return { nhl: build("nhl"), magnus: build("magnus") };
}

// Compétition à afficher d'abord pour un joueur : celle où il joue (la
// plus fournie en points s'il joue aux deux), sinon la plus jouée de la
// ligue.
export function mainCompetition(
  rankings: LeagueCompetitionRankings,
  userId: string
): Competition {
  const mine = (c: Competition) =>
    rankings[c].ranking.find((entry) => entry.userId === userId);
  const nhl = mine("nhl");
  const magnus = mine("magnus");
  if (nhl && magnus) return magnus.totalPoints > nhl.totalPoints ? "magnus" : "nhl";
  if (nhl || magnus) return nhl ? "nhl" : "magnus";
  return rankings.magnus.ranking.length > rankings.nhl.ranking.length ? "magnus" : "nhl";
}

// Classements de la semaine en cours d'une ligue, par compétition (la
// semaine commence au plus tôt à la création de la ligue).
export async function getLeagueWeekRankings(
  supabase: SupabaseClient,
  userIds: string[],
  since: Date,
  now: Date = new Date()
): Promise<Record<Competition, RankingEntry[]>> {
  const week = parisWeekBounds(now, 0);
  const rows = await fetchTotals(supabase, {
    userIds,
    range: {
      start: new Date(Math.max(week.start.getTime(), since.getTime())),
      end: week.end,
    },
  });
  const build = (competition: Competition) =>
    toRanking(
      rows.filter((row) => rangeCount(row, competition) > 0),
      (row) => rangePoints(row, competition),
      seasonTotal
    );
  return { nhl: build("nhl"), magnus: build("magnus") };
}
