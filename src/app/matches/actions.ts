"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

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
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,game_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/matches");
}
