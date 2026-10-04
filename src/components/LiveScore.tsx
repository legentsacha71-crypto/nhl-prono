"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { LiveGame } from "@/lib/liveTypes";
import {
  getLiveScores,
  getServerLiveScores,
  subscribeLiveScores,
} from "@/lib/liveScoresStore";

type LiveScoreProps = {
  gameId: number;
  initialHome: number;
  initialAway: number;
  scoreUnavailable?: boolean;
};

function ScoreView({
  home,
  away,
  finished,
  detail,
}: {
  home: number | null;
  away: number | null;
  finished: boolean;
  detail?: string;
}) {
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
      {(finished || detail) && (
        <p className="mt-0.5 text-[11px] text-neutral-500">
          {finished ? "Terminé · points calculés sous 5 min" : detail}
        </p>
      )}
    </div>
  );
}

function LiveTicker({
  gameId,
  initialHome,
  initialAway,
  scoreUnavailable = false,
  onFinal,
}: LiveScoreProps & { onFinal: (game: LiveGame) => void }) {
  const scores = useSyncExternalStore(
    subscribeLiveScores,
    getLiveScores,
    getServerLiveScores,
  );
  const live = scores[gameId];

  useEffect(() => {
    if (live?.state === "OFF") onFinal(live);
  }, [live, onFinal]);

  return (
    <ScoreView
      home={live ? live.home : scoreUnavailable ? null : initialHome}
      away={live ? live.away : scoreUnavailable ? null : initialAway}
      finished={false}
      detail={live?.detail}
    />
  );
}

// Score d'un match en cours sur sa carte (onglet Matchs), mis à jour toutes
// les 30 s sans recharger la page (voir liveScoresStore.ts). Le score rendu
// par le serveur sert de valeur de départ. Une fois le match terminé, la
// carte se fige et cesse d'interroger /api/live : quand tous les matchs de
// la page sont finis, plus aucune requête ne part.
export default function LiveScore(props: LiveScoreProps) {
  const [final, setFinal] = useState<LiveGame | null>(null);
  if (final) {
    return <ScoreView home={final.home} away={final.away} finished />;
  }
  return <LiveTicker {...props} onFinal={setFinal} />;
}
