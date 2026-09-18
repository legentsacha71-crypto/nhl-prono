"use server";

import { createClient } from "@/utils/supabase/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Recrutement des testeurs Android (test fermé Google Play : 12 testeurs
// pendant 14 jours). L'adresse du compte Google du joueur est rangée dans les
// métadonnées Supabase Auth de son propre compte — pas de table dédiée. Pour
// la récupérer : auth.admin.listUsers() (clé secrète) puis filtrer sur
// user_metadata.android_tester_email, et la copier dans la liste de testeurs
// de Play Console.
//
// Les erreurs attendues sont renvoyées (pas levées) : en production, Next.js
// masque le message des exceptions levées par une Server Action.
export async function registerAndroidTester(
  formData: FormData,
): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return { error: "Adresse e-mail invalide." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "Tu dois être connecté." };
  }

  const { error } = await supabase.auth.updateUser({
    data: {
      android_tester_email: email,
      android_tester_requested_at: new Date().toISOString(),
    },
  });
  if (error) {
    console.error("Erreur registerAndroidTester :", error.message);
    return { error: "Impossible d'enregistrer ton adresse, réessaie." };
  }

  return {};
}
