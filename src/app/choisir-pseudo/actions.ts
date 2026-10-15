"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { USERNAME_MAX, USERNAME_MIN, escapeLike } from "@/lib/username";

// Pseudo d'un compte créé avec Apple / Google (pas de formulaire
// d'inscription) : mêmes règles qu'à l'inscription par email.
export async function chooseUsername(formData: FormData) {
  const username = String(formData.get("username") ?? "").trim();
  const back = (message: string) => redirect(`/choisir-pseudo?error=${encodeURIComponent(message)}`);

  if (username.length < USERNAME_MIN || username.length > USERNAME_MAX) {
    back(`Le pseudo doit faire entre ${USERNAME_MIN} et ${USERNAME_MAX} caractères.`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { data: taken } = await admin
    .from("profiles")
    .select("id")
    .ilike("username", escapeLike(username))
    .limit(1);
  if (taken && taken.length > 0) back("Ce pseudo est déjà pris, choisis-en un autre.");

  const { error } = await admin.from("profiles").insert({ id: user.id, username });
  if (error) {
    back(error.code === "23505" ? "Ce pseudo est déjà pris, choisis-en un autre." : "Erreur lors de la création du profil.");
  }

  redirect("/bienvenue");
}
