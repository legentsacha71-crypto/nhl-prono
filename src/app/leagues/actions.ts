"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

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
  const name = (formData.get("name") as string)?.trim();
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
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  if (!code) {
    redirect(`/leagues?error=${encodeURIComponent("Le code d'invitation est requis.")}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: league, error } = await supabase
    .from("leagues")
    .select("id")
    .eq("code", code)
    .single();

  if (error || !league) {
    redirect(
      `/leagues?error=${encodeURIComponent("Aucune ligue ne correspond à ce code.")}`,
    );
  }

  const { error: memberError } = await supabase
    .from("league_members")
    .insert({ league_id: league.id, user_id: user.id });

  if (memberError) {
    const message =
      memberError.code === "23505"
        ? "Tu es déjà membre de cette ligue."
        : memberError.message;
    redirect(`/leagues?error=${encodeURIComponent(message)}`);
  }

  revalidatePath("/leagues");
  redirect(`/leagues/${league.id}`);
}
