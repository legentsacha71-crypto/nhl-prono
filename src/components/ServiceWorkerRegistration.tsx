"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";

// Selon les versions de Chrome Android, l'installation de l'appli exige un
// service worker avec un handler fetch (voir public/sw.js). On ne
// l'enregistre que dans un navigateur Android : ni dans les wrappers natifs
// Capacitor, ni sur iOS/desktop, pour ne rien changer au comportement du
// site pour les autres joueurs.
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (Capacitor.isNativePlatform()) return;
    if (!/Android/i.test(navigator.userAgent)) return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
