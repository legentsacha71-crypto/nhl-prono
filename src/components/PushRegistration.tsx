"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { PushNotifications } from "@capacitor/push-notifications";
import PushPermissionSheet, { type PushAsk } from "@/components/PushPermissionSheet";
import { outdatedAppPlatform } from "@/lib/appUpdate";
import { hapticSuccess } from "@/lib/native";
import { pushPlatform, registerDevice, requestPushPermission, type PushPlatform } from "@/lib/pushDevice";
import { createClient } from "@/utils/supabase/client";

// Notifications push de l'appli (inscription du téléphone : pushDevice.ts).
//
// Au lancement, pour un joueur connecté :
// - notifications autorisées → l'appareil est enregistré, rien ne s'affiche ;
// - jamais demandé → fenêtre « Active les notifications » (oui / non), et
//   seulement sur « oui » la demande officielle du téléphone, qui ne
//   s'affiche qu'une fois dans la vie de l'appli ;
// - refusées dans le téléphone → fenêtre qui explique où les rallumer.
// « Non merci » : on repose la question une semaine plus tard (un mois si
// elles sont coupées dans les réglages).
//
// Vit dans RootLayout : rien ne s'affiche hors de l'appli native, ni dans
// les anciennes versions sans le module de notifications (iPhone 1.0).

// Pas de fenêtre pendant la connexion, l'inscription, le choix du pseudo ni
// l'écran de bienvenue : elle viendra à la page suivante.
const QUIET_PATHS = ["/login", "/signup", "/auth", "/choisir-pseudo", "/bienvenue"];

const ASKED_KEY = "lnh-push-asked";
const DAY_MS = 24 * 60 * 60 * 1000;
const ASK_AGAIN_MS: Record<PushAsk, number> = { soft: 7 * DAY_MS, settings: 30 * DAY_MS };

function askedWithin(ms: number): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(ASKED_KEY) ?? 0) < ms;
  } catch {
    return true;
  }
}

function markAsked() {
  try {
    localStorage.setItem(ASKED_KEY, String(Date.now()));
  } catch {
    // Stockage indisponible : la fenêtre pourra revenir, sans gravité.
  }
}

export default function PushRegistration() {
  const pathname = usePathname();
  const [ask, setAsk] = useState<PushAsk | null>(null);
  const [platform, setPlatform] = useState<PushPlatform>("ios");
  const userIdRef = useRef<string | null>(null);

  const evaluate = useCallback(async (path: string) => {
    const current = pushPlatform();
    if (!current || document.visibilityState !== "visible") return;
    if (QUIET_PATHS.some((p) => path.startsWith(p))) return;

    const {
      data: { session },
    } = await createClient().auth.getSession();
    if (!session) return;
    userIdRef.current = session.user.id;

    const { receive } = await PushNotifications.checkPermissions();
    if (receive === "granted") {
      await registerDevice(current, session.user.id);
      return;
    }
    // Ancienne version de l'appli : c'est la fenêtre de mise à jour qui
    // s'affiche (AppUpdatePrompt), on demandera après.
    if (outdatedAppPlatform()) return;
    const variant: PushAsk = receive === "denied" ? "settings" : "soft";
    if (askedWithin(ASK_AGAIN_MS[variant])) return;
    markAsked();
    setPlatform(current);
    setAsk(variant);
  }, []);

  // À l'ouverture, à chaque page (le joueur vient peut-être de se connecter)
  // et au retour dans l'appli (il vient peut-être de les activer dans les
  // Réglages).
  useEffect(() => {
    const run = () => void evaluate(pathname).catch(() => {});
    const timer = setTimeout(run, 600);
    document.addEventListener("visibilitychange", run);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", run);
    };
  }, [pathname, evaluate]);

  async function accept() {
    const variant = ask;
    setAsk(null);
    if (variant === "settings") {
      // Ouvre la page de l'appli dans les Réglages d'iOS.
      window.location.href = "app-settings:";
      return;
    }
    if (userIdRef.current && (await requestPushPermission(platform, userIdRef.current))) {
      void hapticSuccess();
    }
  }

  if (!ask) return null;
  return <PushPermissionSheet ask={ask} platform={platform} onAccept={accept} onDecline={() => setAsk(null)} />;
}
