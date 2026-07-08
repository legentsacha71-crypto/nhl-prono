"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { NHL_TEAMS } from "@/lib/nhlTeams";
import { getStanleyCupOdds } from "@/lib/oddsApi";

export async function updateFavoriteTeam(formData: FormData) {
  const favoriteTeam = formData.get("favoriteTeam") as string;

  if (favoriteTeam && !NHL_TEAMS.some((t) => t.abbrev === favoriteTeam)) {
    throw new Error("Équipe invalide.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non connecté.");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ favorite_team: favoriteTeam || null })
    .eq("id", user.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/profil");
}

const ALLOWED_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_AVATAR_SIZE = 3 * 1024 * 1024; // 3 Mo

export async function uploadAvatar(formData: FormData) {
  const file = formData.get("avatar") as File | null;

  if (!file || file.size === 0) {
    throw new Error("Aucune image sélectionnée.");
  }

  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error("Format d'image non supporté (jpg, png ou webp uniquement).");
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error("L'image est trop lourde (3 Mo maximum).");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non connecté.");
  }

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("profiles")
    .update({ avatar_url: `${publicUrl}?t=${Date.now()}` })
    .eq("id", user.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  revalidatePath("/profil");
}

export async function submitStanleyCupPick(formData: FormData) {
  const teamAbbrev = formData.get("teamAbbrev") as string;

  if (!teamAbbrev || !NHL_TEAMS.some((t) => t.abbrev === teamAbbrev)) {
    throw new Error("Équipe invalide.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non connecté.");
  }

  const { data: season } = await supabase
    .from("stanley_cup_season")
    .select("lock_at, winner_team")
    .eq("id", 1)
    .single();

  if (!season || season.winner_team || new Date(season.lock_at) <= new Date()) {
    throw new Error("Les pronostics coupe Stanley sont verrouillés.");
  }

  const odds = await getStanleyCupOdds();
  const teamOdds = odds.find((o) => o.abbrev === teamAbbrev);
  if (!teamOdds) {
    throw new Error("Cote indisponible pour cette équipe.");
  }

  const { error } = await supabase.from("stanley_cup_picks").upsert(
    {
      user_id: user.id,
      team_abbrev: teamAbbrev,
      odds_price: teamOdds.price,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/profil");
}
