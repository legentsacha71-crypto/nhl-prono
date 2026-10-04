"use client";

import { useSyncExternalStore } from "react";
import { isMagnusGameId } from "@/lib/competition";
import {
  getLiveScores,
  getServerLiveScores,
  subscribeLiveScores,
} from "@/lib/liveScoresStore";

// Score d'un match en cours sur sa carte (onglet Matchs), mis à jour toutes
// les 15 s sans recharger la page (voir liveScoresStore.ts). Le score rendu
// par le serveur sert de valeur de départ, remplacé dès la première réponse.
export default function LiveScore({
  gameId,
  initialHome,
  initialAway,
  scoreUnavailable = false,
}: {
  gameId: number;
  initialHome: number;
  initialAway: number;
  scoreUnavailable?: boolean;
}) {
  const scores = useSyncExternalStore(
    subscribeLiveScores,
    getLiveScores,
    getServerLiveScores,
  );
  const live = scores[gameId];

  const finished = live?.state === "OFF";
  const home = live ? live.home : scoreUnavailable ? null : initialHome;
  const away = live ? live.away : scoreUnavailable ? null : initialAway;

  if (home === null || away === null) {
    return (
      <p className="mt-3 text-center text-xs text-neutral-500">
        Match en cours · score en direct non fourni par la ligue
      </p>
    );
  }

  return (
    <div className="mt-3 text-center">
      <p
        className={`font-display text-2xl tracking-wide ${
          finished ? "text-neutral-200" : "text-red-400"
        }`}
      >
        {home} - {away}
      </p>
      {(finished || live?.detail) && (
        <p className="mt-0.5 text-[11px] text-neutral-500">
          {finished
            ? isMagnusGameId(gameId)
              ? "Terminé · points dès que la ligue valide le résultat"
              : "Terminé · points calculés sous 5 min"
            : live?.detail}
        </p>
      )}
    </div>
  );
}
