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
