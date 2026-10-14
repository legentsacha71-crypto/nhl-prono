import type { SupabaseClient } from "@supabase/supabase-js";
import { getRanking } from "./ranking";
import { lastMessagesByLeague, type ChatMessage } from "./leagueChat";

// Les ligues d'un joueur avec de quoi les résumer en une carte : sa place,
// le leader et le dernier message du chat (pages Ligues et Chat).
export type MyLeague = {
  id: string;
  name: string;
  memberCount: number;
  myRank: number;
  leader: { userId: string; username: string } | null;
  lastMessage: ChatMessage | null;
};

export async function getMyLeagues(supabase: SupabaseClient, userId: string): Promise<MyLeague[]> {
  const { data: memberships } = await supabase
    .from("league_members")
    .select("leagues(id, name)")
    .eq("user_id", userId);

  type League = { id: string; name: string };
  const leagues = (memberships ?? [])
    .map((m) => m.leagues as unknown as League)
    .filter((l): l is League => !!l);
  if (leagues.length === 0) return [];

  const leagueIds = leagues.map((l) => l.id);
  // Une requête groupée pour les membres de toutes les ligues (pas une par
  // ligue), puis un seul calcul de points pour tous ces joueurs.
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
  const everyone = [...new Set((allMembers ?? []).map((m) => m.user_id as string))];

  const [ranking, lastMessages] = await Promise.all([
    getRanking(supabase, everyone),
    lastMessagesByLeague(supabase, leagueIds, userId),
  ]);
  // getRanking trie déjà par points décroissants.
  const order = new Map(ranking.map((entry, index) => [entry.userId, index]));
  const username = new Map(ranking.map((entry) => [entry.userId, entry.username]));

  return leagues.map((league) => {
    const members = [...(membersByLeague.get(league.id) ?? [])].sort(
      (a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity),
    );
    const leaderId = members[0];
    return {
      id: league.id,
      name: league.name,
      memberCount: members.length,
      myRank: members.indexOf(userId) + 1,
      leader: leaderId ? { userId: leaderId, username: username.get(leaderId) ?? "?" } : null,
      lastMessage: lastMessages.get(league.id) ?? null,
    };
  });
}
