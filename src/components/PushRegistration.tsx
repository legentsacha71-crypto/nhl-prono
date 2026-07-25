"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { registerPushToken } from "@/app/notifications/actions";

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

    let registrationListener: { remove: () => void } | undefined;
    let errorListener: { remove: () => void } | undefined;
    let cancelled = false;

    async function setup() {
      const permStatus = await PushNotifications.checkPermissions();
      let receive = permStatus.receive;

      // On ne redemande la permission que si elle n'a jamais été tranchée :
      // si l'utilisateur a refusé, on ne le re-sollicite pas à chaque
      // lancement (comportement natif iOS standard).
      if (receive === "prompt" || receive === "prompt-with-rationale") {
        const requested = await PushNotifications.requestPermissions();
        receive = requested.receive;
      }

      if (cancelled || receive !== "granted") return;

      registrationListener = await PushNotifications.addListener(
        "registration",
        (token) => {
          registerPushToken(token.value).catch((err) => {
            console.error("Échec de l'enregistrement du token push :", err);
          });
        },
      );
      errorListener = await PushNotifications.addListener(
        "registrationError",
        (err) => {
          console.error("Erreur d'enregistrement push APNs :", err);
        },
      );

      await PushNotifications.register();
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
