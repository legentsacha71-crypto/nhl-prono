import { Capacitor } from "@capacitor/core";

// Le site sert toutes les versions installées de l'appli, dont d'anciennes
// sans notifications ni connexion Apple / Google. Elles n'embarquent pas non
// plus le module « App », arrivé avec l'iPhone 1.2 et l'Android 1.3 : son
// absence suffit à les repérer.

export type StorePlatform = "ios" | "android";

export const STORE_URL: Record<StorePlatform, string> = {
  ios: "https://apps.apple.com/app/id6791933996",
  android: "https://play.google.com/store/apps/details?id=com.lanuithockey.app",
};

// Plateforme de l'appli à mettre à jour, ou null (à jour, ou site web).
export function outdatedAppPlatform(): StorePlatform | null {
  if (!Capacitor.isNativePlatform() || Capacitor.isPluginAvailable("App")) return null;
  const platform = Capacitor.getPlatform();
  return platform === "ios" || platform === "android" ? platform : null;
}
