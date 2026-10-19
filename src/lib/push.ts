import {
  sendApnsPush,
  isApnsConfigured,
  apnsMissingEnvVars,
  ApnsInvalidTokenError,
  type ApnsAlert,
} from "@/lib/apns";
import {
  sendFcmPush,
  isFcmConfigured,
  fcmMissingEnvVars,
  FcmInvalidTokenError,
} from "@/lib/fcm";
import { pushAllowed, readNotifPrefs, type NotifPrefs, type PushCategory } from "@/lib/notifPrefs";

// Point d'entrée unique à utiliser depuis les server actions / routes API :
// envoie une notif à tous les appareils enregistrés d'un utilisateur
// (potentiellement plusieurs iPhones et/ou téléphones Android), dispatche
// vers APNs ou FCM selon la colonne `platform` de device_push_tokens,
// nettoie les tokens que l'un ou l'autre service signale comme invalides,
// et ne fait jamais planter l'appelant (best effort, comme les notifs
// in-app déjà en place dans profil/actions.ts).

// `url` (facultatif) : page de l'appli à ouvrir quand on touche la
// notification (ex. "/notifications", "/leagues/<id>?tab=chat").
export type PushAlert = ApnsAlert & { url?: string };

async function adminClient() {
  // Import différé pour éviter tout cycle d'import avec admin.ts, qui n'a
  // pas besoin de connaître ce module.
  const { createAdminClient } = await import("@/utils/supabase/admin");
  return createAdminClient();
}

// Réglages de notifications de tous les joueurs, en une passe : pour les
// envois groupés (rappels, récap), plutôt qu'une lecture par joueur.
export async function loadAllNotifPrefs(): Promise<Map<string, NotifPrefs>> {
  const admin = await adminClient();
  const prefs = new Map<string, NotifPrefs>();
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const user of data.users) prefs.set(user.id, readNotifPrefs(user.user_metadata));
    if (data.users.length < 1000) break;
  }
  return prefs;
}

// `category` : rien n'est envoyé si le joueur l'a coupée dans ses réglages.
// `prefs` : ses réglages s'ils sont déjà chargés (loadAllNotifPrefs).
export async function sendPushToUser(
  userId: string,
  alert: PushAlert,
  category: PushCategory,
  prefs?: NotifPrefs,
): Promise<void> {
  const admin = await adminClient();

  let userPrefs = prefs;
  if (!userPrefs) {
    const { data } = await admin.auth.admin.getUserById(userId);
    userPrefs = readNotifPrefs(data.user?.user_metadata);
  }
  if (!pushAllowed(userPrefs, category)) return;

  const { data: tokens } = await admin
    .from("device_push_tokens")
    .select("token, platform")
    .eq("user_id", userId);

  if (!tokens || tokens.length === 0) {
    return;
  }

  const { url, ...content } = alert;
  const data = url ? { url } : undefined;

  await Promise.all(
    tokens.map(async ({ token, platform }) => {
      const isAndroid = platform === "android";

      if (isAndroid ? !isFcmConfigured() : !isApnsConfigured()) {
        // Silencieux par design pour ne jamais casser l'appelant, mais on
        // log quand même quelles variables manquent : sans ça, une config
        // Vercel incomplète ne produit aucune trace nulle part et est
        // indébuggable.
        const missing = isAndroid
          ? fcmMissingEnvVars()
          : apnsMissingEnvVars();
        console.error(
          `Push ${isAndroid ? "FCM" : "APNs"} non configuré, variables manquantes : ${missing.join(", ")}`,
        );
        return;
      }

      try {
        if (isAndroid) {
          await sendFcmPush(token, content, data);
        } else {
          await sendApnsPush(token, content, data);
        }
      } catch (err) {
        if (
          err instanceof ApnsInvalidTokenError ||
          err instanceof FcmInvalidTokenError
        ) {
          await admin.from("device_push_tokens").delete().eq("token", token);
        } else {
          console.error("Échec de l'envoi d'une notification push :", err);
        }
      }
    }),
  );
}
