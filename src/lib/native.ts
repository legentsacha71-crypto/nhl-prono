import { Capacitor } from "@capacitor/core";

// Fonctions natives de l'appli (iPhone / Android). Le site sert toutes les
// versions installées à la fois, dont d'anciennes sans ces modules (l'iPhone
// 1.0 n'en a aucun) : chaque appel vérifie d'abord que le module est présent
// et ne fait rien sinon, sans jamais lever d'erreur.

export function hasNativePlugin(name: string): boolean {
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable(name);
}

// Petite vibration (prono validé, message envoyé…).
export async function hapticTap(): Promise<void> {
  if (!hasNativePlugin("Haptics")) return;
  try {
    const { Haptics, ImpactStyle } = await import("@capacitor/haptics");
    await Haptics.impact({ style: ImpactStyle.Light });
  } catch {
    // Pas de vibration : sans importance.
  }
}

// Vibration de réussite (score exact).
export async function hapticSuccess(): Promise<void> {
  if (!hasNativePlugin("Haptics")) return;
  try {
    const { Haptics, NotificationType } = await import("@capacitor/haptics");
    await Haptics.notification({ type: NotificationType.Success });
  } catch {
    // Pas de vibration : sans importance.
  }
}

// Menu de partage natif (WhatsApp, SMS…). Renvoie false s'il n'est pas
// disponible, pour que l'appelant passe au partage web ou à la copie.
export async function nativeShare(content: { title: string; text: string; url: string }): Promise<boolean> {
  if (!hasNativePlugin("Share")) return false;
  try {
    const { Share } = await import("@capacitor/share");
    await Share.share({ ...content, dialogTitle: content.title });
  } catch {
    // Partage annulé par l'utilisateur : rien à faire.
  }
  return true;
}

// Fenêtre officielle « Noter l'appli » d'Apple / Google. Les stores
// décident eux-mêmes de l'afficher ou non (quelques fois par an au plus).
export async function requestStoreReview(): Promise<void> {
  if (!hasNativePlugin("InAppReview")) return;
  try {
    const { InAppReview } = await import("@capacitor-community/in-app-review");
    await InAppReview.requestReview();
  } catch {
    // Pas de fenêtre : sans importance.
  }
}
