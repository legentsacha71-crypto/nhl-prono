import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/utils/supabase/admin";

// Cookie posé par /rejoindre/<code> quand l'invité n'est pas encore
// connecté : la ligue est rejointe dès qu'il l'est (voir proxy.ts).
export const PENDING_LEAGUE_COOKIE = "lnh_pending_league";

export type JoinResult =
  | { ok: true; leagueId: string; alreadyMember: boolean }
  | { ok: false; error: string };

// Rejoindre une ligue avec son code d'invitation (formulaire de la page
// Ligues ou lien /rejoindre/<code>). Le créateur de la ligue est prévenu.
export async function joinLeagueByCode(
  supabase: SupabaseClient,
  userId: string,
  rawCode: string,
): Promise<JoinResult> {
  const code = rawCode.trim().toUpperCase();
  if (!code) return { ok: false, error: "Le code d'invitation est requis." };

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, owner_id")
    .eq("code", code)
    .maybeSingle();
  if (!league) return { ok: false, error: "Aucune ligue ne correspond à ce code." };

  const { error } = await supabase
    .from("league_members")
    .insert({ league_id: league.id, user_id: userId });
  if (error) {
    if (error.code === "23505") return { ok: true, leagueId: league.id, alreadyMember: true };
    return { ok: false, error: error.message };
  }

  if (league.owner_id !== userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();
    await createAdminClient()
      .from("notifications")
      .insert({
        user_id: league.owner_id,
        message: `${profile?.username ?? "Un joueur"} a rejoint ta ligue "${league.name}".`,
      });
  }

  return { ok: true, leagueId: league.id, alreadyMember: false };
}
