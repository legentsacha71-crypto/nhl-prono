import type { SupabaseClient } from "@supabase/supabase-js";
import { getLeagueCompetitionRankings, mainCompetition, type Competition } from "./ranking";
import { lastMessagesByLeague, type ChatMessage } from "./leagueChat";

// Les ligues d'un joueur avec de quoi les résumer en une carte : sa place
// et le leader dans la compétition où il joue (NHL ou Ligue Magnus), et le
// dernier message du chat (pages Ligues et Chat).
export type MyLeague = {
  id: string;
  name: string;
  memberCount: number;
  competition: Competition;
  // Joueurs classés dans cette compétition, et la place du joueur (0 s'il
  // n'y joue pas).
  playerCount: number;
  myRank: number;
  leader: { userId: string; username: string; points: number } | null;
  lastMessage: ChatMessage | null;
};

export async function getMyLeagues(supabase: SupabaseClient, userId: string): Promise<MyLeague[]> {
  const { data: memberships } = await supabase
    .from("league_members")
    .select("leagues(id, name, created_at)")
    .eq("user_id", userId);

  type League = { id: string; name: string; created_at: string };
  const leagues = (memberships ?? [])
    .map((m) => m.leagues as unknown as League)
    .filter((l): l is League => !!l);
  if (leagues.length === 0) return [];

  const leagueIds = leagues.map((l) => l.id);
  // Une requête groupée pour les membres de toutes les ligues (pas une par
  // ligue). Les points, eux, se calculent ligue par ligue : chacune ne
  // compte que les matchs joués depuis sa création.
  const { data: allMembers } = await supabase
    .from("league_members")
    .select("league_id, user_id")
    .in("league_id", leagueIds);

  const membersByLeague = new Map<string, string[]>();
  for (const row of allMembers ?? []) {
    const list = membersByLeague.get(row.league_id) ?? [];
    list.push(row.user_id);
    membersByLeague.set(row.league_id, list);
  }
  const [rankings, lastMessages] = await Promise.all([
    Promise.all(
      leagues.map((league) =>
        getLeagueCompetitionRankings(
          supabase,
          membersByLeague.get(league.id) ?? [],
          new Date(league.created_at),
        ),
      ),
    ),
    lastMessagesByLeague(supabase, leagueIds, userId),
  ]);

  return leagues.map((league, i) => {
    const competition = mainCompetition(rankings[i], userId);
    // Classement déjà trié par points décroissants.
    const ranking = rankings[i][competition].ranking;
    const leader = ranking[0];
    return {
      id: league.id,
      name: league.name,
      memberCount: (membersByLeague.get(league.id) ?? []).length,
      competition,
      playerCount: ranking.length,
      myRank: ranking.findIndex((entry) => entry.userId === userId) + 1,
      leader: leader ? { userId: leader.userId, username: leader.username, points: leader.totalPoints } : null,
      lastMessage: lastMessages.get(league.id) ?? null,
    };
  });
}
