"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { LEAGUE_NAME_MAX } from "@/lib/leagueName";
import { joinLeagueByCode } from "@/lib/joinLeague";

function generateInviteCode(): string {
  // Pas de 0/O ni 1/I pour éviter les confusions à la lecture.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createLeague(formData: FormData) {
  const name = (formData.get("name") as string)?.trim().slice(0, LEAGUE_NAME_MAX);
  if (!name) {
    redirect(`/leagues?error=${encodeURIComponent("Le nom de la ligue est requis.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let league: { id: string } | null = null;
  for (let attempt = 0; attempt < 5 && !league; attempt++) {
    const code = generateInviteCode();
    const { data, error } = await supabase
      .from("leagues")
      .insert({ name, code, owner_id: user.id })
      .select("id")
      .single();

    if (!error) {
      league = data;
    } else if (error.code !== "23505") {
      redirect(`/leagues?error=${encodeURIComponent(error.message)}`);
    }
  }

  if (!league) {
    redirect(
      `/leagues?error=${encodeURIComponent("Impossible de générer un code unique, réessaie.")}`,
    );
  }

  const { error: memberError } = await supabase
    .from("league_members")
    .insert({ league_id: league.id, user_id: user.id });

  if (memberError) {
    redirect(`/leagues?error=${encodeURIComponent(memberError.message)}`);
  }

  revalidatePath("/leagues");
  redirect(`/leagues/${league.id}`);
}

export async function joinLeague(formData: FormData) {
  const code = (formData.get("code") as string) ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const result = await joinLeagueByCode(supabase, user.id, code);
  if (!result.ok || result.alreadyMember) {
    const message = result.ok ? "Tu es déjà membre de cette ligue." : result.error;
    redirect(`/leagues?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/leagues");
  redirect(`/leagues/${result.leagueId}`);
}

// Suppression d'une ligue, réservée à son créateur : le chat, les membres
// puis la ligue elle-même (pas de suppression en cascade garantie, même
// ordre que la suppression de compte dans profil/actions.ts). Les autres
// membres sont prévenus par une notification.
export async function deleteLeague(formData: FormData) {
  const leagueId = formData.get("leagueId") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: league } = await admin
    .from("leagues")
    .select("id, name, owner_id")
    .eq("id", leagueId)
    .single();
  if (!league || league.owner_id !== user.id) {
    throw new Error("Seul le créateur de la ligue peut la supprimer.");
  }

  const { data: members } = await admin
    .from("league_members")
    .select("user_id")
    .eq("league_id", league.id)
    .neq("user_id", user.id);

  await admin.from("league_messages").delete().eq("league_id", league.id);
  await admin.from("league_members").delete().eq("league_id", league.id);
  const { error } = await admin.from("leagues").delete().eq("id", league.id);
  if (error) throw new Error(error.message);

  if (members && members.length > 0) {
    await admin.from("notifications").insert(
      members.map((m) => ({
        user_id: m.user_id,
        message: `La ligue "${league.name}" a été supprimée par son créateur.`,
      })),
    );
  }

  revalidatePath("/leagues");
  redirect("/leagues");
}

// Renommer une ligue, réservé à son créateur. Renvoie le nom enregistré.
export async function renameLeague(leagueId: string, rawName: string): Promise<string> {
  const name = rawName.trim().slice(0, LEAGUE_NAME_MAX);
  if (!name) throw new Error("Le nom de la ligue est requis.");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non connecté.");

  const admin = createAdminClient();
  const { data: league } = await admin
    .from("leagues")
    .select("owner_id")
    .eq("id", leagueId)
    .single();
  if (!league || league.owner_id !== user.id) {
    throw new Error("Seul le créateur de la ligue peut la renommer.");
  }

  const { error } = await admin.from("leagues").update({ name }).eq("id", leagueId);
  if (error) throw new Error(error.message);

  revalidatePath("/leagues");
  revalidatePath(`/leagues/${leagueId}`);
  return name;
}
