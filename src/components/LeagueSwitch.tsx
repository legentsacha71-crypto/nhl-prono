"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";

type League = "nhl" | "magnus";

type LeagueSwitchProps = {
  nhlContent: ReactNode;
  magnusContent: ReactNode;
};

/**
 * Bouton on/off pour choisir la compétition affichée (NHL / Ligue Magnus).
 * Affiche les logos officiels des deux ligues (public/logos/nhl.png,
 * public/logos/magnus.png) — choix assumé malgré le risque de marque lié à
 * la reproduction de logos déposés dans une app commerciale déjà publiée
 * (contrairement à TeamBadge.tsx, qui évite volontairement les logos
 * officiels des équipes NHL).
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
          className="relative flex h-12 w-24 items-center justify-between rounded-full border border-neutral-800 bg-neutral-900 p-1 transition-transform duration-150 active:scale-95"
        >
          <span
            className={`absolute left-1 top-1 h-10 w-10 rounded-full bg-sky-600 transition-transform duration-300 ease-out ${
              league === "nhl" ? "translate-x-0" : "translate-x-12"
            }`}
          />
          <span
            className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full p-1.5 transition-opacity duration-300 ${
              league === "nhl" ? "opacity-100" : "opacity-40"
            }`}
          >
            <Image
              src="/logos/nhl.png"
              alt="NHL"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </span>
          <span
            className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full p-1.5 transition-opacity duration-300 ${
              league === "magnus" ? "opacity-100" : "opacity-40"
            }`}
          >
            <Image
              src="/logos/magnus.png"
              alt="Ligue Magnus"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </span>
        </button>
      </div>

      <div>{league === "nhl" ? nhlContent : magnusContent}</div>
    </div>
  );
}
