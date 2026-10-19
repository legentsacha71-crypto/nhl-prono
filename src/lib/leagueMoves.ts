import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getLeagueCompetitionRankings,
  type Competition,
  type LeagueCompetitionRankings,
  type RankingEntry,
} from "./ranking";

// Mouvements dans les classements des ligues entre deux instants : qui est
// passé devant qui (notif « tu t'es fait doubler », envoyée après la
// notation des matchs) et qui a gagné ou perdu des places (récap du matin).

export type LeagueInfo = { id: string; name: string; createdAt: Date; memberIds: string[] };
export type LeagueSnapshot = Map<string, LeagueCompetitionRankings>;

const COMPETITIONS: Competition[] = ["nhl", "magnus"];

// Ligues dont font partie ces joueurs, avec tous leurs membres.
export async function leaguesOf(supabase: SupabaseClient, userIds: string[]): Promise<LeagueInfo[]> {
  if (userIds.length === 0) return [];
  const { data: memberships } = await supabase
    .from("league_members")
    .select("league_id")
    .in("user_id", userIds);
  const leagueIds = [...new Set((memberships ?? []).map((m) => m.league_id as string))];
  if (leagueIds.length === 0) return [];

  const [{ data: leagues }, { data: members }] = await Promise.all([
    supabase.from("leagues").select("id, name, created_at").in("id", leagueIds),
    supabase.from("league_members").select("league_id, user_id").in("league_id", leagueIds),
  ]);
  const membersByLeague = new Map<string, string[]>();
  for (const row of members ?? []) {
    const list = membersByLeague.get(row.league_id) ?? [];
    list.push(row.user_id);
    membersByLeague.set(row.league_id, list);
  }
  return (leagues ?? [])
    .map((l) => ({
      id: l.id as string,
      name: l.name as string,
      createdAt: new Date(l.created_at),
      memberIds: membersByLeague.get(l.id) ?? [],
    }))
    .filter((l) => l.memberIds.length > 1);
}

// Classements de ces ligues, maintenant ou tels qu'ils étaient à `until`.
export async function snapshotLeagues(
  supabase: SupabaseClient,
  leagues: LeagueInfo[],
  until?: Date,
): Promise<LeagueSnapshot> {
  const rankings = await Promise.all(
    leagues.map((l) => getLeagueCompetitionRankings(supabase, l.memberIds, l.createdAt, until)),
  );
  return new Map(leagues.map((l, i) => [l.id, rankings[i]]));
}

// Place d'un joueur : 1 + le nombre de joueurs qui ont strictement plus de
// points (les ex æquo partagent la même place). null s'il n'est pas classé.
function rankOf(ranking: RankingEntry[], userId: string): number | null {
  const me = ranking.find((e) => e.userId === userId);
  if (!me) return null;
  return 1 + ranking.filter((e) => e.totalPoints > me.totalPoints).length;
}

// « (Magnus) » après le nom de la ligue quand le joueur y est classé dans les
// deux compétitions, pour savoir de quel classement on parle.
function competitionSuffix(rankings: LeagueCompetitionRankings, userId: string, competition: Competition): string {
  const inBoth = COMPETITIONS.every((c) => rankings[c].ranking.some((e) => e.userId === userId));
  if (!inBoth) return "";
  return competition === "nhl" ? " (NHL)" : " (Magnus)";
}

export type Overtake = { userId: string; byUsername: string; leagueId: string; where: string };

// Joueurs qui se sont fait doubler entre les deux classements : quelqu'un
// qui avait strictement moins de points qu'eux en a maintenant strictement
// plus. Un seul dépassement retenu par joueur, ligue et compétition.
export function findOvertakes(leagues: LeagueInfo[], before: LeagueSnapshot, after: LeagueSnapshot): Overtake[] {
  const overtakes: Overtake[] = [];
  for (const league of leagues) {
    const b = before.get(league.id);
    const a = after.get(league.id);
    if (!b || !a) continue;
    for (const competition of COMPETITIONS) {
      const pointsBefore = new Map(b[competition].ranking.map((e) => [e.userId, e.totalPoints]));
      for (const victim of a[competition].ranking) {
        const victimBefore = pointsBefore.get(victim.userId);
        if (victimBefore === undefined) continue;
        const passer = a[competition].ranking.find((other) => {
          const otherBefore = pointsBefore.get(other.userId);
          return (
            other.userId !== victim.userId &&
            otherBefore !== undefined &&
            otherBefore < victimBefore &&
            other.totalPoints > victim.totalPoints
          );
        });
        if (passer) {
          overtakes.push({
            userId: victim.userId,
            byUsername: passer.username,
            leagueId: league.id,
            where: `« ${league.name} »${competitionSuffix(a, victim.userId, competition)}`,
          });
        }
      }
    }
  }
  return overtakes;
}

function ordinal(rank: number): string {
  return rank === 1 ? "1er" : `${rank}e`;
}

// Le changement de place le plus marquant d'un joueur dans ses ligues, en
// une phrase (récap du matin) ; null s'il n'a bougé nulle part.
export function bestRankMove(
  leagues: LeagueInfo[],
  before: LeagueSnapshot,
  after: LeagueSnapshot,
  userId: string,
): string | null {
  let best: { gain: number; text: string } | null = null;
  for (const league of leagues) {
    if (!league.memberIds.includes(userId)) continue;
    const b = before.get(league.id);
    const a = after.get(league.id);
    if (!b || !a) continue;
    for (const competition of COMPETITIONS) {
      const from = rankOf(b[competition].ranking, userId);
      const to = rankOf(a[competition].ranking, userId);
      if (from === null || to === null || from === to) continue;
      const where = `« ${league.name} »${competitionSuffix(a, userId, competition)}`;
      const gain = from - to;
      // Une montée passe avant une descente ; prendre la tête avant tout.
      const score = to === 1 ? 1000 : gain > 0 ? 100 + gain : gain;
      const text =
        to === 1
          ? `Tu prends la tête de ${where} 👑`
          : gain > 0
            ? `Tu passes ${ordinal(to)} dans ${where} 📈`
            : `Tu recules à la ${ordinal(to)} place dans ${where}`;
      if (!best || score > best.gain) best = { gain: score, text };
    }
  }
  return best?.text ?? null;
}
