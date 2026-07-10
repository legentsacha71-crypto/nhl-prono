"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { getWeekKey } from "@/lib/week";

export async function submitPrediction(formData: FormData) {
  const gameId = Number(formData.get("gameId"));
  const startTimeUTC = formData.get("startTimeUTC") as string;
  const awayScore = Number(formData.get("awayScore"));
  const homeScore = Number(formData.get("homeScore"));

  if (new Date(startTimeUTC).getTime() <= Date.now()) {
    throw new Error("Ce match a déjà commencé, le pronostic est verrouillé.");
  }

  if (
    !Number.isInteger(awayScore) ||
    !Number.isInteger(homeScore) ||
    awayScore < 0 ||
    homeScore < 0
  ) {
    throw new Error("Scores invalides.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non connecté.");
  }

  const { error } = await supabase.from("predictions").upsert(
    {
      user_id: user.id,
      game_id: gameId,
      away_score: awayScore,
      home_score: homeScore,
      game_start_time: startTimeUTC,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,game_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/matches");
}

// Boost x2 : réservé aux membres Premium (profiles.is_premium), un seul
// match boosté par semaine (semaine ISO calculée sur le début du match). Un
// nouveau boost remplace automatiquement celui de la même semaine plutôt que
// d'obliger l'utilisateur à d'abord le retirer manuellement.
export async function toggleBoost(formData: FormData) {
  const gameId = Number(formData.get("gameId"));
  const startTimeUTC = formData.get("startTimeUTC") as string;

  if (new Date(startTimeUTC).getTime() <= Date.now()) {
    throw new Error("Ce match a déjà commencé, impossible de le booster.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non connecté.");
  }

  // Les deux requêtes ne dépendent que de user.id / gameId, pas l'une de
  // l'autre : on les lance en parallèle plutôt qu'en série pour réduire la
  // latence perçue au clic.
  const [{ data: profile }, { data: current }] = await Promise.all([
    supabase.from("profiles").select("is_premium").eq("id", user.id).single(),
    supabase
      .from("predictions")
      .select("id, boosted")
      .eq("user_id", user.id)
      .eq("game_id", gameId)
      .maybeSingle(),
  ]);

  if (!profile?.is_premium) {
    throw new Error("Le boost x2 est réservé aux membres Premium.");
  }

  if (!current) {
    throw new Error("Fais d'abord ton pronostic avant de le booster.");
  }

  if (current.boosted) {
    const { error } = await supabase
      .from("predictions")
      .update({ boosted: false })
      .eq("id", current.id);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath("/matches");
    return;
  }

  const weekKey = getWeekKey(startTimeUTC);

  const { data: activeBoosts } = await supabase
    .from("predictions")
    .select("id, game_start_time")
    .eq("user_id", user.id)
    .eq("boosted", true);

  const sameWeekBoost = (activeBoosts ?? []).find(
    (p) => p.game_start_time && getWeekKey(p.game_start_time) === weekKey,
  );

  if (sameWeekBoost) {
    const { error: unboostError } = await supabase
      .from("predictions")
      .update({ boosted: false })
      .eq("id", sameWeekBoost.id);

    if (unboostError) {
      throw new Error(unboostError.message);
    }
  }

  const { error } = await supabase
    .from("predictions")
    .update({ boosted: true })
    .eq("id", current.id);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/matches");
}
