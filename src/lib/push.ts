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

// Point d'entrée unique à utiliser depuis les server actions / routes API :
// envoie une notif à tous les appareils enregistrés d'un utilisateur
// (potentiellement plusieurs iPhones et/ou téléphones Android), dispatche
// vers APNs ou FCM selon la colonne `platform` de device_push_tokens,
// nettoie les tokens que l'un ou l'autre service signale comme invalides,
// et ne fait jamais planter l'appelant (best effort, comme les notifs
// in-app déjà en place dans profil/actions.ts).

export type PushAlert = ApnsAlert;

export async function sendPushToUser(
  userId: string,
  alert: PushAlert,
): Promise<void> {
  // Import différé pour éviter tout cycle d'import avec admin.ts, qui n'a
  // pas besoin de connaître ce module.
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  const { data: tokens } = await admin
    .from("device_push_tokens")
    .select("token, platform")
    .eq("user_id", userId);

  if (!tokens || tokens.length === 0) {
    return;
  }

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
          await sendFcmPush(token, alert);
        } else {
          await sendApnsPush(token, alert);
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
