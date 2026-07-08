"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";

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

  if (!username || username.length < 3) {
    redirect(
      `/signup?error=${encodeURIComponent("Le pseudo doit contenir au moins 3 caractères.")}`,
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
  const admin = createAdminClient();
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
