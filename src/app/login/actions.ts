"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { USERNAME_MAX, USERNAME_MIN, escapeLike } from "@/lib/username";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const username = (formData.get("username") as string)?.trim();

  if (
    !username ||
    username.length < USERNAME_MIN ||
    username.length > USERNAME_MAX
  ) {
    redirect(
      `/signup?error=${encodeURIComponent(`Le pseudo doit faire entre ${USERNAME_MIN} et ${USERNAME_MAX} caractères.`)}`,
    );
  }

  // La contrainte d'unicité en base est sensible à la casse : sans ce
  // contrôle, "sacha" pouvait s'inscrire alors que "Sacha" existait déjà
  // (sosies dans le classement, recherche d'amis ambiguë). Même règle que le
  // changement de pseudo (updateUsername). Client admin : pas encore de
  // session à ce stade.
  const admin = createAdminClient();
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", escapeLike(username))
    .limit(1);

  if (taken && taken.length > 0) {
    redirect(
      `/signup?error=${encodeURIComponent("Ce pseudo est déjà pris, choisis-en un autre.")}`,
    );
  }

  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  if (!data.user) {
    redirect(
      `/signup?error=${encodeURIComponent("Erreur lors de la création du compte.")}`,
    );
  }

  // À ce stade, si la confirmation par email est activée, il n'y a pas encore
  // de session active : on doit passer par le client admin (qui ignore les
  // règles RLS) pour créer la ligne de profil associée au nouvel utilisateur.
  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: data.user.id, username });

  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    const message =
      profileError.code === "23505"
        ? "Ce pseudo est déjà pris, choisis-en un autre."
        : "Erreur lors de la création du profil.";
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  redirect("/login?message=Vérifie tes emails pour confirmer ton compte.");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
