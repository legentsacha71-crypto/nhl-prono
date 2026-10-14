import type { SupabaseClient } from "@supabase/supabase-js";

// Messages du chat d'une ligue (table league_messages). En plus des
// messages des joueurs, /api/grade-games y publie un message automatique
// quand un membre trouve un score exact : son texte est un préfixe réservé
// suivi du détail en JSON, et l'appli l'affiche comme un bandeau.

export type ExactScoreEvent = {
  gameId: number;
  homeAbbrev: string;
  awayAbbrev: string;
  homeScore: number;
  awayScore: number;
  points: number;
};

export type ChatMessage = {
  id: string;
  userId: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  body: string;
  exact: ExactScoreEvent | null;
};

export const EXACT_EVENT_PREFIX = "🎯exact:";
export const MESSAGE_MAX_LENGTH = 500;
const INITIAL_MESSAGES = 50;

export function exactEventBody(event: ExactScoreEvent): string {
  return `${EXACT_EVENT_PREFIX}${JSON.stringify(event)}`;
}

function parseExactEvent(body: string): ExactScoreEvent | null {
  if (!body.startsWith(EXACT_EVENT_PREFIX)) return null;
  try {
    const e = JSON.parse(body.slice(EXACT_EVENT_PREFIX.length));
    const numbers = [e.gameId, e.homeScore, e.awayScore, e.points];
    if (!numbers.every(Number.isFinite)) return null;
    if (typeof e.homeAbbrev !== "string" || typeof e.awayAbbrev !== "string") return null;
    return {
      gameId: e.gameId,
      homeAbbrev: e.homeAbbrev,
      awayAbbrev: e.awayAbbrev,
      homeScore: e.homeScore,
      awayScore: e.awayScore,
      points: e.points,
    };
  } catch {
    return null;
  }
}

type MessageRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string;
  profiles: { username: string; avatar_url: string | null } | null;
};

export const MESSAGE_COLUMNS = "id, body, created_at, user_id, profiles(username, avatar_url)";

export function toChatMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    userId: row.user_id,
    username: row.profiles?.username ?? "?",
    avatarUrl: row.profiles?.avatar_url ?? null,
    createdAt: row.created_at,
    body: row.body,
    exact: parseExactEvent(row.body),
  };
}

// Un joueur pourrait écrire lui-même un faux message automatique : on ne
// garde que ceux qui correspondent à un vrai score exact noté.
async function dropForgedEvents(
  supabase: SupabaseClient,
  messages: ChatMessage[],
): Promise<ChatMessage[]> {
  const events = messages.filter((m) => m.body.startsWith(EXACT_EVENT_PREFIX));
  if (events.length === 0) return messages;

  const parsed = events.filter((m) => m.exact);
  const { data } = parsed.length
    ? await supabase
        .from("predictions")
        .select("user_id, game_id")
        .in("game_id", [...new Set(parsed.map((m) => m.exact!.gameId))])
        .in("user_id", [...new Set(parsed.map((m) => m.userId))])
        .eq("is_exact_score", true)
    : { data: [] };
  const real = new Set((data ?? []).map((p) => `${p.user_id}:${p.game_id}`));

  return messages.filter(
    (m) =>
      !m.body.startsWith(EXACT_EVENT_PREFIX) ||
      (m.exact !== null && real.has(`${m.userId}:${m.exact.gameId}`)),
  );
}

// Derniers messages d'une ligue (ordre chronologique), ou seulement ceux
// postés après `after` pour le rafraîchissement du chat ouvert.
export async function loadMessages(
  supabase: SupabaseClient,
  leagueId: string,
  { after }: { after?: string } = {},
): Promise<ChatMessage[]> {
  const query = supabase.from("league_messages").select(MESSAGE_COLUMNS).eq("league_id", leagueId);
  const { data } = after
    ? await query.gt("created_at", after).order("created_at", { ascending: true }).limit(INITIAL_MESSAGES)
    : await query.order("created_at", { ascending: false }).limit(INITIAL_MESSAGES);

  const rows = (data ?? []) as unknown as MessageRow[];
  const messages = (after ? rows : [...rows].reverse()).map(toChatMessage);
  return dropForgedEvents(supabase, messages);
}

// Dernier message de chaque ligue écrit par quelqu'un d'autre que le
// joueur : aperçu dans la liste des ligues et pastille "non lu".
export async function lastMessagesByLeague(
  supabase: SupabaseClient,
  leagueIds: string[],
  userId: string,
): Promise<Map<string, ChatMessage>> {
  const last = new Map<string, ChatMessage>();
  if (leagueIds.length === 0) return last;
  const { data } = await supabase
    .from("league_messages")
    .select(`league_id, ${MESSAGE_COLUMNS}`)
    .in("league_id", leagueIds)
    .neq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200);
  for (const row of (data ?? []) as unknown as (MessageRow & { league_id: string })[]) {
    if (!last.has(row.league_id)) last.set(row.league_id, toChatMessage(row));
  }
  return last;
}

export function messagePreview(message: ChatMessage): string {
  if (message.exact) {
    const e = message.exact;
    return `🎯 ${message.username} : score exact ${e.homeAbbrev} ${e.homeScore}-${e.awayScore} ${e.awayAbbrev}`;
  }
  return `${message.username} : ${message.body}`;
}
