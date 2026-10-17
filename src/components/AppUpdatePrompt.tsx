"use client";

import { useEffect, useState } from "react";
import { Bell, Download, Link2, LogIn } from "lucide-react";
import BottomSheet from "@/components/BottomSheet";
import { outdatedAppPlatform, STORE_URL, type StorePlatform } from "@/lib/appUpdate";

// À l'ouverture d'une ancienne version de l'appli (iPhone 1.0, Android 1.2
// et avant) : fenêtre « Nouvelle version disponible » qui envoie sur l'App
// Store / Google Play. « Plus tard » la cache jusqu'au prochain lancement.

const DISMISSED_KEY = "lnh-update-later";

const PERKS: Record<StorePlatform, { icon: typeof Bell; text: string }[]> = {
  ios: [
    { icon: Bell, text: "Les notifications : rappel avant tes matchs, alerte score exact" },
    { icon: LogIn, text: "Connexion en un geste avec Apple ou Google" },
    { icon: Link2, text: "Les liens d'invitation qui t'ajoutent direct à la ligue" },
  ],
  android: [
    { icon: LogIn, text: "Connexion en un geste avec ton compte Google" },
    { icon: Link2, text: "Les liens d'invitation qui t'ajoutent direct à la ligue" },
    { icon: Bell, text: "Les notifications ouvrent la bonne page" },
  ],
};

function dismissedThisLaunch(): boolean {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export default function AppUpdatePrompt() {
  const [platform, setPlatform] = useState<StorePlatform | null>(null);

  useEffect(() => {
    const outdated = outdatedAppPlatform();
    if (!outdated || dismissedThisLaunch()) return;
    const timer = setTimeout(() => setPlatform(outdated), 600);
    return () => clearTimeout(timer);
  }, []);

  if (!platform) return null;

  function later() {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Stockage indisponible : la fenêtre se fermera quand même.
    }
    setPlatform(null);
  }

  return (
    <BottomSheet labelledBy="update-sheet-title">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-sky-500/15 ring-1 ring-sky-500/40">
        <Download className="h-8 w-8 text-sky-400" aria-hidden="true" />
      </div>

      <h2
        id="update-sheet-title"
        className="mt-4 text-center font-display text-3xl uppercase leading-none tracking-wide text-neutral-50"
      >
        Nouvelle version disponible
      </h2>
      <p className="mt-2 text-center text-sm text-neutral-400">Mets à jour La Nuit Hockey pour avoir :</p>

      <ul className="mt-5 space-y-3">
        {PERKS[platform].map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 rounded-xl bg-neutral-800/60 px-3.5 py-3">
            <Icon className="h-5 w-5 shrink-0 text-sky-400" aria-hidden="true" />
            <span className="text-sm leading-snug text-neutral-200">{text}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6 space-y-2">
        <a
          href={STORE_URL[platform]}
          className="block w-full rounded-xl bg-sky-500 py-3.5 text-center text-[15px] font-semibold text-neutral-950 transition-transform active:scale-[0.98]"
        >
          {platform === "ios" ? "Mettre à jour sur l'App Store" : "Mettre à jour sur Google Play"}
        </a>
        <button
          type="button"
          onClick={later}
          className="w-full rounded-xl py-3 text-sm font-semibold text-neutral-400 transition-transform active:scale-[0.98]"
        >
          Plus tard
        </button>
      </div>
    </BottomSheet>
  );
}
