"use client";

import { useEffect } from "react";
import { hasNativePlugin } from "@/lib/native";

// Dans l'appli native : ouvre la bonne page quand on touche une notification
// (champ `url` envoyé par push.ts) ou un lien d'invitation qui lance l'appli
// (liens universels iOS / App Links Android, ex. /rejoindre/K7P2QX).
// Ne fait rien sur le web ni dans les versions sans ces modules.

const APP_HOST = "nhl-prono-drjd.vercel.app";

// Chemin interne à ouvrir, ou null si l'adresse n'est pas une page de l'appli.
function inAppPath(raw: string): string | null {
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  try {
    const url = new URL(raw);
    if (url.host !== APP_HOST) return null;
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

function open(raw: unknown) {
  if (typeof raw !== "string") return;
  const path = inAppPath(raw);
  if (!path || path === `${window.location.pathname}${window.location.search}`) return;
  // Navigation complète : /rejoindre/… est une route serveur, pas une page.
  window.location.assign(path);
}

const HANDLED_LAUNCH_KEY = "lnh-launch-url";

function readHandledLaunch(): string | null {
  try {
    return sessionStorage.getItem(HANDLED_LAUNCH_KEY);
  } catch {
    return null;
  }
}

function writeHandledLaunch(url: string) {
  try {
    sessionStorage.setItem(HANDLED_LAUNCH_KEY, url);
  } catch {
    // Sans stockage, on suit le lien quand même (rare).
  }
}

export default function NativeLinks() {
  useEffect(() => {
    const listeners: { remove: () => Promise<void> }[] = [];
    let cancelled = false;

    async function setup() {
      if (hasNativePlugin("PushNotifications")) {
        const { PushNotifications } = await import("@capacitor/push-notifications");
        const listener = await PushNotifications.addListener("pushNotificationActionPerformed", (action) =>
          open(action.notification.data?.url),
        );
        if (cancelled) await listener.remove();
        else listeners.push(listener);
      }
      if (hasNativePlugin("App")) {
        const { App } = await import("@capacitor/app");
        // Appli lancée par un lien (elle n'était pas ouverte). getLaunchUrl
        // renvoie ce même lien à chaque rechargement de la page : on ne le
        // suit qu'une fois, sinon /rejoindre/… boucle sur lui-même.
        const launch = await App.getLaunchUrl().catch(() => undefined);
        if (launch?.url && readHandledLaunch() !== launch.url) {
          writeHandledLaunch(launch.url);
          open(launch.url);
        }
        const listener = await App.addListener("appUrlOpen", (event) => open(event.url));
        if (cancelled) await listener.remove();
        else listeners.push(listener);
      }
    }

    setup().catch(() => {});
    return () => {
      cancelled = true;
      listeners.forEach((listener) => void listener.remove());
    };
  }, []);

  return null;
}
