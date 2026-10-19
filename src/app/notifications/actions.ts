"use server";

import { createClient } from "@/utils/supabase/server";
import { isPushCategory, NOTIF_PREFS_KEY, type NotifPrefs } from "@/lib/notifPrefs";

// Réglages de notifications du joueur (page /notifications/reglages). La page
// envoie l'ensemble de ses choix à chaque changement : deux interrupteurs
// touchés coup sur coup ne s'écrasent pas.
export async function updateNotifPrefs(prefs: NotifPrefs): Promise<{ error?: string }> {
  const clean: NotifPrefs = {};
  for (const [category, enabled] of Object.entries(prefs ?? {})) {
    if (isPushCategory(category) && typeof enabled === "boolean") clean[category] = enabled;
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Connecte-toi pour changer tes réglages." };
  const { error } = await supabase.auth.updateUser({ data: { [NOTIF_PREFS_KEY]: clean } });
  return error ? { error: "Réglage non enregistré, réessaie." } : {};
}

// Instrumentation temporaire (diagnostic) : PushRegistration.tsx tourne côté
// natif où le seul log disponible (console.error) ne remonte nulle part
// d'observable une fois l'app installée hors Xcode (TestFlight/App Store).
// Cette action ne fait que journaliser côté serveur (visible dans les logs
// Vercel) ce qui se passe réellement lors d'une tentative d'enregistrement
// push. À retirer une fois le bug d'enregistrement résolu.
export async function logPushDebug(event: string, detail?: string) {
  console.log(`[push-debug] ${event}`, detail ?? "");
}

// Appelée depuis PushRegistration.tsx dès que l'appli native récupère un
// token d'appareil (APNs sur iOS, FCM sur Android — @capacitor/push-notifications
// bascule automatiquement sur FCM quand Capacitor.getPlatform() === "android").
// Upsert sur `token` (pas sur user_id) : un même utilisateur peut avoir
// plusieurs appareils, et un même token ne doit jamais être dupliqué pour un
// autre utilisateur (cas d'un appareil partagé où quelqu'un se déconnecte/
// reconnecte avec un autre compte).
export async function registerPushToken(
  token: string,
  platform: "ios" | "android",
) {
  if (!token) {
    throw new Error("Token manquant.");
  }
  if (platform !== "ios" && platform !== "android") {
    // Entrée non fiable (PushRegistration.tsx est côté client) : on
    // valide plutôt que de laisser une valeur arbitraire atterrir dans
    // device_push_tokens, que push.ts utilise ensuite pour choisir entre
    // APNs et FCM.
    throw new Error("Plateforme invalide.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Pas connecté (encore sur /login) : on ignore silencieusement plutôt
    // que de faire planter le composant, l'enregistrement retentera au
    // prochain lancement une fois connecté.
    console.log(
      "[push-debug] registerPushToken: aucun user Supabase authentifié, token ignoré",
    );
    return;
  }

  const { error } = await supabase.from("device_push_tokens").upsert(
    {
      user_id: user.id,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "token" },
  );

  if (error) {
    throw new Error(error.message);
  }
}
