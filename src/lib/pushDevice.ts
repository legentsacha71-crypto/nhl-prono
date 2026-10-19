import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { registerPushToken, logPushDebug } from "@/app/notifications/actions";
import { hasNativePlugin } from "@/lib/native";

// Inscription du téléphone aux notifications push (APNs sur iPhone, Firebase
// sur Android : @capacitor/push-notifications choisit tout seul, seule la
// valeur de `platform` transmise à registerPushToken() diffère). Partagé par
// la fenêtre d'ouverture (PushRegistration) et la page de réglages.

export type PushPlatform = "ios" | "android";

// Capacitor.getPlatform() est typé `string` côté SDK (pas de littéral).
export function pushPlatform(): PushPlatform | null {
  if (!hasNativePlugin("PushNotifications")) return null;
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android" ? platform : null;
}

// Écouteurs posés une seule fois par lancement ; l'enregistrement est refait
// si un autre joueur se connecte sur le même téléphone.
let listeners: Promise<void> | null = null;
let registeredUserId: string | null = null;

function addListeners(platform: PushPlatform): Promise<void> {
  listeners ??= (async () => {
    await PushNotifications.addListener("registration", (token) => {
      registerPushToken(token.value, platform).catch((err) => {
        logPushDebug("registerPushToken a rejeté", err instanceof Error ? err.message : String(err)).catch(() => {});
      });
    });
    await PushNotifications.addListener("registrationError", (err) => {
      logPushDebug("registrationError", JSON.stringify(err)).catch(() => {});
    });
  })();
  return listeners;
}

export async function registerDevice(platform: PushPlatform, userId: string): Promise<void> {
  if (registeredUserId === userId) return;
  registeredUserId = userId;
  try {
    await addListeners(platform);
    await PushNotifications.register();
  } catch (err) {
    registeredUserId = null;
    logPushDebug("register() a levé une exception", err instanceof Error ? err.message : String(err)).catch(() => {});
  }
}

// Demande officielle du téléphone, puis inscription si le joueur accepte.
// iOS signale un refus par une erreur : on le traite comme « refusé ».
export async function requestPushPermission(platform: PushPlatform, userId: string): Promise<boolean> {
  try {
    const { receive } = await PushNotifications.requestPermissions();
    logPushDebug("requestPermissions", receive).catch(() => {});
    if (receive !== "granted") return false;
    await registerDevice(platform, userId);
    return true;
  } catch (err) {
    logPushDebug("requestPermissions a échoué", err instanceof Error ? err.message : String(err)).catch(() => {});
    return false;
  }
}
