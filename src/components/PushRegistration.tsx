"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { registerPushToken, logPushDebug } from "@/app/notifications/actions";

// Enregistre l'appareil pour les notifications push APNs dès l'ouverture de
// l'appli. `Capacitor.isNativePlatform()` est false sur le web (le site
// tourne aussi hors de l'app iOS) : ce composant ne fait donc rien en
// dehors du wrapper natif, pas besoin de le conditionner ailleurs.
//
// Vit dans RootLayout comme AppSplash, pour se déclencher à chaque vrai
// lancement de l'appli plutôt qu'à chaque navigation côté client.
export default function PushRegistration() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    // TODO(android push) : le plugin @capacitor/push-notifications bascule
    // automatiquement sur Firebase Cloud Messaging sur Android, mais aucun
    // projet Firebase n'est encore configuré côté natif (pas de
    // google-services.json) — voir android/app/build.gradle. Appeler
    // register() dans cet état échoue de façon non garantie côté natif
    // (FirebaseApp non initialisé) plutôt que de simplement rejeter la
    // promesse JS. On limite donc l'enregistrement à iOS pour l'instant, le
    // temps de brancher FCM (nouveau module équivalent à apns.ts) dans un
    // commit dédié ; sendPushToUser() côté serveur ne cible de toute façon
    // que des tokens APNs aujourd'hui.
    if (Capacitor.getPlatform() !== "ios") return;

    let registrationListener: { remove: () => void } | undefined;
    let errorListener: { remove: () => void } | undefined;
    let cancelled = false;

    async function setup() {
      const permStatus = await PushNotifications.checkPermissions();
      let receive = permStatus.receive;
      logPushDebug("checkPermissions", receive).catch(() => {});

      // On ne redemande la permission que si elle n'a jamais été tranchée :
      // si l'utilisateur a refusé, on ne le re-sollicite pas à chaque
      // lancement (comportement natif iOS standard).
      if (receive === "prompt" || receive === "prompt-with-rationale") {
        const requested = await PushNotifications.requestPermissions();
        receive = requested.receive;
        logPushDebug("requestPermissions", receive).catch(() => {});
      }

      if (cancelled || receive !== "granted") {
        logPushDebug(
          "abandon avant register()",
          `cancelled=${cancelled} receive=${receive}`
        ).catch(() => {});
        return;
      }

      registrationListener = await PushNotifications.addListener(
        "registration",
        (token) => {
          logPushDebug(
            "listener registration déclenché",
            `token length=${token.value.length}`
          ).catch(() => {});
          registerPushToken(token.value).catch((err) => {
            console.error("Échec de l'enregistrement du token push :", err);
            logPushDebug(
              "registerPushToken a rejeté",
              err instanceof Error ? err.message : String(err)
            ).catch(() => {});
          });
        }
      );
      errorListener = await PushNotifications.addListener(
        "registrationError",
        (err) => {
          console.error("Erreur d'enregistrement push APNs :", err);
          logPushDebug(
            "listener registrationError déclenché",
            JSON.stringify(err)
          ).catch(() => {});
        }
      );

      try {
        await PushNotifications.register();
        logPushDebug("register() a résolu sans erreur synchrone").catch(
          () => {}
        );
      } catch (err) {
        logPushDebug(
          "register() a levé une exception",
          err instanceof Error ? err.message : String(err)
        ).catch(() => {});
      }
    }

    setup();

    return () => {
      cancelled = true;
      registrationListener?.remove();
      errorListener?.remove();
    };
  }, []);

  return null;
}
