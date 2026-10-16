"use client";

import { useState, type ReactNode } from "react";

type League = "nhl" | "magnus";

type LeagueSwitchProps = {
  nhlContent: ReactNode;
  magnusContent: ReactNode;
  // Compétition affichée à l'ouverture (NHL par défaut).
  defaultLeague?: League;
};

/**
 * Bouton pour choisir la compétition affichée (NHL / Ligue Magnus), en
 * texte : les logos officiels des ligues, marques déposées, ne sont plus
 * affichés (risque de refus App Store), comme pour les équipes (TeamBadge).
 *
 * Les deux contenus sont déjà rendus côté serveur et passés en props ; on ne
 * fait qu'afficher l'un ou l'autre côté client, sans rechargement.
 */
export default function LeagueSwitch({
  nhlContent,
  magnusContent,
  defaultLeague = "nhl",
}: LeagueSwitchProps) {
  const [league, setLeague] = useState<League>(defaultLeague);

  return (
    <div className="space-y-4">
      <div className="flex justify-center">
        <button
          type="button"
          role="switch"
          aria-checked={league === "magnus"}
          aria-label="Choisir la compétition : NHL ou Ligue Magnus"
          onClick={() => setLeague((l) => (l === "nhl" ? "magnus" : "nhl"))}
          className="relative grid h-11 w-48 grid-cols-2 items-center rounded-full border border-neutral-800 bg-neutral-900 p-1 transition-transform duration-150 active:scale-95"
        >
          <span
            aria-hidden="true"
            className={`absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-sky-600 transition-transform duration-300 ease-out ${
              league === "nhl" ? "translate-x-0" : "translate-x-full"
            }`}
          />
          {(["nhl", "magnus"] as const).map((key) => (
            <span
              key={key}
              className={`relative z-10 text-center font-display text-lg leading-none tracking-wider transition-colors duration-300 ${
                league === key ? "text-white" : "text-neutral-500"
              }`}
            >
              {key === "nhl" ? "NHL" : "Magnus"}
            </span>
          ))}
        </button>
      </div>

      <div>{league === "nhl" ? nhlContent : magnusContent}</div>
    </div>
  );
}
