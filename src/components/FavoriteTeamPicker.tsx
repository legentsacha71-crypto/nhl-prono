"use client";

import { useState, useTransition } from "react";
import TeamBadge from "@/components/TeamBadge";
import { NHL_TEAMS, getTeamName } from "@/lib/nhlTeams";

type FavoriteTeamPickerProps = {
  favoriteTeam: string | null | undefined;
  updateFavoriteTeam: (favoriteTeam: string | null) => Promise<void>;
};

// Ancienne version basée sur <details>/<summary> : cliquer sur une équipe
// dans le panneau ne déclenchait rien de fiable (comportement capricieux
// des boutons imbriqués dans un <details>, surtout sur mobile). On gère
// désormais l'ouverture/fermeture nous-mêmes avec un state React, ce qui
// garantit que le clic fonctionne, tout en gardant un menu compact et
// repliable (pas une grille toujours visible).
export default function FavoriteTeamPicker({
  favoriteTeam,
  updateFavoriteTeam,
}: FavoriteTeamPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handlePick(abbrev: string) {
    setIsOpen(false);
    setError(null);
    startTransition(async () => {
      try {
        await updateFavoriteTeam(abbrev);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors de la sauvegarde.",
        );
      }
    });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 shadow-sm shadow-black/20 transition-colors duration-150 hover:border-neutral-600 hover:bg-neutral-800"
      >
        {favoriteTeam ? (
          <>
            <TeamBadge
              abbrev={favoriteTeam}
              name={getTeamName(favoriteTeam)}
              size={28}
            />
            <span>{getTeamName(favoriteTeam)}</span>
          </>
        ) : (
          <span className="text-neutral-400">Choisir une équipe favorite</span>
        )}
        <span
          className={`ml-auto text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          ▾
        </span>
        {isPending && (
          <span className="ml-1 text-xs text-neutral-500">…</span>
        )}
      </button>

      {isOpen && (
        <div className="absolute left-1/2 z-50 mt-2 w-80 max-w-[90vw] -translate-x-1/2 rounded-xl border border-neutral-800 bg-neutral-950 p-3 shadow-xl">
          <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto">
            {NHL_TEAMS.map((team) => (
              <button
                key={team.abbrev}
                type="button"
                onClick={() => handlePick(team.abbrev)}
                disabled={isPending}
                className="flex flex-col items-center gap-1 rounded-lg p-1 transition-colors duration-150 hover:bg-neutral-900 disabled:opacity-50"
              >
                <TeamBadge abbrev={team.abbrev} name={team.name} size={40} />
                <span className="text-center text-[9px] leading-tight text-neutral-400">
                  {team.abbrev}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="absolute left-1/2 mt-1 w-max max-w-[90vw] -translate-x-1/2 text-xs text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
