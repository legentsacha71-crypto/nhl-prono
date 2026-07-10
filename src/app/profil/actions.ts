"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { NHL_TEAMS } from "@/lib/nhlTeams";
import { STANLEY_CUP_CANDIDATES } from "@/lib/nhlStanleyCup";
import { TOP_SCORER_CANDIDATES } from "@/lib/nhlScorers";

export async function updateFavoriteTeam(favoriteTeam: string | null) {
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

export async function submitStanleyCupPick(teamAbbrev: string) {
  if (
    !teamAbbrev ||
    !STANLEY_CUP_CANDIDATES.some((c) => c.abbrev === teamAbbrev)
  ) {
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

  const { error } = await supabase.from("stanley_cup_picks").upsert(
    {
      user_id: user.id,
      team_abbrev: teamAbbrev,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/profil");
}

export async function submitTopScorerPick(playerName: string) {
  if (
    !playerName ||
    !TOP_SCORER_CANDIDATES.some((c) => c.name === playerName)
  ) {
    throw new Error("Joueur invalide.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non connecté.");
  }

  const { data: season } = await supabase
    .from("top_scorer_season")
    .select("lock_at, winner_player")
    .eq("id", 1)
    .single();

  if (
    !season ||
    season.winner_player ||
    new Date(season.lock_at) <= new Date()
  ) {
    throw new Error("Les pronostics meilleur buteur sont verrouillés.");
  }

  const { error } = await supabase.from("top_scorer_picks").upsert(
    {
      user_id: user.id,
      player_name: playerName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/profil");
}

export async function sendFriendRequest(formData: FormData) {
  const username = (formData.get("username") as string)?.trim();
  if (!username) {
    throw new Error("Pseudo requis.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non connecté.");
  }

  const { data: target } = await supabase
    .from("profiles")
    .select("id, username")
    .ilike("username", username)
    .maybeSingle();

  if (!target) {
    throw new Error("Aucun joueur avec ce pseudo.");
  }
  if (target.id === user.id) {
    throw new Error("Tu ne peux pas t'ajouter toi-même.");
  }

  const { data: existing } = await supabase
    .from("friendships")
    .select("id, status")
    .or(
      `and(requester_id.eq.${user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${user.id})`,
    )
    .maybeSingle();

  if (existing) {
    throw new Error(
      existing.status === "accepted"
        ? "Vous êtes déjà amis."
        : "Une demande est déjà en attente.",
    );
  }

  const { error } = await supabase.from("friendships").insert({
    requester_id: user.id,
    addressee_id: target.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const admin = createAdminClient();
  await admin.from("notifications").insert({
    user_id: target.id,
    message: `${myProfile?.username ?? "Un joueur"} t'a envoyé une demande d'ami.`,
  });

  revalidatePath("/profil");
}

export async function respondToFriendRequest(formData: FormData) {
  const friendshipId = formData.get("friendshipId") as string;
  const action = formData.get("action") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non connecté.");
  }

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id")
    .eq("id", friendshipId)
    .single();

  if (!friendship || friendship.addressee_id !== user.id) {
    throw new Error("Demande introuvable.");
  }

  if (action === "accept") {
    // Les deux requêtes sont indépendantes (l'update ne dépend pas du
    // select) : on les lance en parallèle pour réduire la latence.
    const [{ error: acceptError }, { data: myProfile }] = await Promise.all([
      supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", friendshipId),
      supabase.from("profiles").select("username").eq("id", user.id).single(),
    ]);

    if (acceptError) {
      throw new Error(acceptError.message);
    }

    const admin = createAdminClient();
    await admin.from("notifications").insert({
      user_id: friendship.requester_id,
      message: `${myProfile?.username ?? "Un joueur"} a accepté ta demande d'ami.`,
    });
  } else {
    const { error: declineError } = await supabase
      .from("friendships")
      .delete()
      .eq("id", friendshipId);

    if (declineError) {
      throw new Error(declineError.message);
    }
  }

  revalidatePath("/profil");
}

export async function removeFriend(formData: FormData) {
  const friendshipId = formData.get("friendshipId") as string;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Non connecté.");
  }

  const { data: friendship } = await supabase
    .from("friendships")
    .select("id, requester_id, addressee_id")
    .eq("id", friendshipId)
    .single();

  if (
    !friendship ||
    (friendship.requester_id !== user.id && friendship.addressee_id !== user.id)
  ) {
    throw new Error("Amitié introuvable.");
  }

  const { error: deleteError } = await supabase
    .from("friendships")
    .delete()
    .eq("id", friendshipId);

  if (deleteError) {
    throw new Error(deleteError.message);
  }

  revalidatePath("/profil");
}

