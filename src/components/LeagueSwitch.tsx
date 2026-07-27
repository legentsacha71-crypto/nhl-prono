"use client";

import { useState, type ReactNode } from "react";

type League = "nhl" | "magnus";

type LeagueSwitchProps = {
  nhlContent: ReactNode;
  magnusContent: ReactNode;
};

/**
 * Bouton on/off pour choisir la compétition affichée (NHL / Ligue Magnus).
 * Utilise des drapeaux emoji plutôt que les logos officiels des ligues :
 * TeamBadge.tsx a déjà fait ce choix pour les équipes (éviter de reproduire
 * la propriété intellectuelle de la LNH), on reste cohérent avec la même
 * logique ici plutôt que de réintroduire le risque avec deux logos de ligue
 * affichés en permanence.
 *
 * Les deux contenus sont déjà rendus côté serveur et passés en props ; on ne
 * fait qu'afficher l'un ou l'autre côté client, sans rechargement.
 */
export default function LeagueSwitch({
  nhlContent,
  magnusContent,
}: LeagueSwitchProps) {
  const [league, setLeague] = useState<League>("nhl");

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <button
          type="button"
          role="switch"
          aria-checked={league === "magnus"}
          aria-label="Choisir la compétition"
          onClick={() => setLeague((l) => (l === "nhl" ? "magnus" : "nhl"))}
          className="relative flex h-12 w-24 items-center justify-between rounded-full border border-neutral-800 bg-neutral-900 p-1"
        >
          <span
            className={`absolute left-1 top-1 h-10 w-10 rounded-full bg-sky-600 transition-transform duration-300 ease-out ${
              league === "nhl" ? "translate-x-0" : "translate-x-12"
            }`}
          />
          <span
            className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-xl transition-opacity duration-300 ${
              league === "nhl" ? "opacity-100" : "opacity-40"
            }`}
          >
            🇺🇸
          </span>
          <span
            className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-xl transition-opacity duration-300 ${
              league === "magnus" ? "opacity-100" : "opacity-40"
            }`}
          >
            🇫🇷
          </span>
        </button>
      </div>

      <div>{league === "nhl" ? nhlContent : magnusContent}</div>
    </div>
  );
}
