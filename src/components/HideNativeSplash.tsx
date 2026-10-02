"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

// Dans l'appli native, l'écran de lancement (logo sur fond sombre) reste
// affiché pendant le chargement du site au lieu d'un écran blanc (voir
// SplashScreen dans capacitor.config.ts). On le retire dès que la page est
// affichée. Les versions de l'appli publiées avant l'ajout du module natif
// rejettent l'appel : sans conséquence, leur écran se ferme tout seul.
export default function HideNativeSplash() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    SplashScreen.hide().catch(() => {});
  }, []);

  return null;
}
