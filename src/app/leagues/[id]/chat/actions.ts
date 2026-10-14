"use server";

import { after } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { sendPushToUser } from "@/lib/push";
import {
  EXACT_EVENT_PREFIX,
  MESSAGE_COLUMNS,
  MESSAGE_MAX_LENGTH,
  toChatMessage,
  type ChatMessage,
} from "@/lib/leagueChat";

// Pas de nouvelle notif tant que la conversation est déjà lancée : seul le
// premier message après un silence de quelques minutes prévient la ligue.
const PUSH_QUIET_MS = 3 * 60 * 1000;

export async function sendMessage(leagueId: string, rawBody: string): Promise<ChatMessage> {
  const body = rawBody.trim().slice(0, MESSAGE_MAX_LENGTH);
  if (!body) throw new Error("Message vide.");
  // Réservé aux messages automatiques de score exact (voir leagueChat.ts).
  if (body.startsWith(EXACT_EVENT_PREFIX)) throw new Error("Message invalide.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté.");

  const { data: previous } = await supabase
    .from("league_messages")
    .select("created_at")
    .eq("league_id", leagueId)
    .not("body", "like", `${EXACT_EVENT_PREFIX}%`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("league_messages")
    .insert({ league_id: leagueId, user_id: user.id, body })
    .select(MESSAGE_COLUMNS)
    .single();
  if (error || !data) throw new Error(error?.message ?? "Message non envoyé.");

  const message = toChatMessage(data as unknown as Parameters<typeof toChatMessage>[0]);

  const quiet =
    !previous || Date.now() - Date.parse(previous.created_at) > PUSH_QUIET_MS;
  if (quiet) {
    // Après la réponse : l'envoi des notifs ne retarde pas l'affichage du
    // message, et un échec ne l'empêche pas (sendPushToUser ne lève jamais).
    after(async () => {
      const admin = createAdminClient();
      const [{ data: league }, { data: members }] = await Promise.all([
        admin.from("leagues").select("name").eq("id", leagueId).single(),
        admin.from("league_members").select("user_id").eq("league_id", leagueId).neq("user_id", user.id),
      ]);
      const text = body.length > 120 ? `${body.slice(0, 119)}…` : body;
      await Promise.all(
        (members ?? []).map((m) =>
          sendPushToUser(m.user_id, {
            title: `💬 ${league?.name ?? "Ta ligue"}`,
            body: `${message.username} : ${text}`,
          }),
        ),
      );
    });
  }

  return message;
}
