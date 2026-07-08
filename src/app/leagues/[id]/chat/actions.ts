"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";

export async function sendMessage(formData: FormData) {
  const leagueId = formData.get("leagueId") as string;
  const body = (formData.get("body") as string)?.trim();

  if (!body) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non connecté.");
  }

  const { error } = await supabase.from("league_messages").insert({
    league_id: leagueId,
    user_id: user.id,
    body,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/leagues/${leagueId}/chat`);
}
