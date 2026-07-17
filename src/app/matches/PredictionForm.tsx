"use client";

import { useEffect, useRef, useState } from "react";
import { submitPrediction } from "./actions";

type Props = {
  gameId: number;
  startTimeUTC: string;
  awayAbbrev: string;
  homeAbbrev: string;
  initialAwayScore?: number;
  initialHomeScore?: number;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const SAVE_DELAY_MS = 700;

// Plus de bouton "Valider" : chaque score tapé est sauvegardé automatiquement
// après une courte pause (debounce), directement via la Server Action —
// rendu plus moderne et sans friction pour l'utilisateur. Le verrouillage
// une fois le match commencé reste appliqué côté serveur dans
// submitPrediction ; on le reflète aussi ici pour désactiver les champs sans
// attendre un refresh de page.
export default function PredictionForm({
  gameId,
  startTimeUTC,
  awayAbbrev,
  homeAbbrev,
  initialAwayScore,
  initialHomeScore,
}: Props) {
  const [awayScore, setAwayScore] = useState(
    initialAwayScore != null ? String(initialAwayScore) : "",
  );
  const [homeScore, setHomeScore] = useState(
    initialHomeScore != null ? String(initialHomeScore) : "",
  );
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [locked, setLocked] = useState(
    () => Date.now() >= new Date(startTimeUTC).getTime(),
  );
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (locked) return;
    // setTimeout overflow au-delà d'environ 24,8 jours (limite d'un entier
    // 32 bits signé) : un délai plus long se déclenche immédiatement au lieu
    // d'attendre. Les matchs pouvant être annoncés des mois à l'avance, on
    // vérifie plutôt à intervalle régulier plutôt qu'avec un délai unique.
    const interval = setInterval(() => {
      if (Date.now() >= new Date(startTimeUTC).getTime()) {
        setLocked(true);
      }
    }, 30_000);
    return () => clearInterval(interval);
  }, [startTimeUTC, locked]);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
    };
  }, []);

  function scheduleSave(nextAway: string, nextHome: string) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);

    const awayNum = Number(nextAway);
    const homeNum = Number(nextHome);
    const isValid =
      nextAway !== "" &&
      nextHome !== "" &&
      Number.isInteger(awayNum) &&
      Number.isInteger(homeNum) &&
      awayNum >= 0 &&
      homeNum >= 0;

    if (!isValid) {
      setStatus("idle");
      return;
    }

    saveTimeout.current = setTimeout(async () => {
      setStatus("saving");
      try {
        const formData = new FormData();
        formData.set("gameId", String(gameId));
        formData.set("startTimeUTC", startTimeUTC);
        formData.set("awayScore", nextAway);
        formData.set("homeScore", nextHome);
        await submitPrediction(formData);
        setStatus("saved");
      } catch {
        setStatus("error");
        if (Date.now() >= new Date(startTimeUTC).getTime()) {
          setLocked(true);
        }
      }
    }, SAVE_DELAY_MS);
  }

  return (
    // Grille à 3 colonnes symétriques (espace réservé à gauche = largeur du
    // statut à droite) pour que les cases de score restent bien centrées,
    // peu importe la largeur du texte de statut ("Enregistrement…", etc.).
    // Avec un simple flex+justify-center, ce texte de statut à droite
    // décalait visuellement les cases vers la gauche.
    <div className="mt-3 grid grid-cols-[5rem_1fr_5rem] items-end gap-3">
      <span aria-hidden="true" />
      <div className="flex items-end justify-center gap-3">
        <div className="flex flex-col items-center">
          <label htmlFor={`away-${gameId}`} className="text-xs text-neutral-500">
            {awayAbbrev}
          </label>
          <input
            id={`away-${gameId}`}
            type="number"
            min={0}
            disabled={locked}
            value={awayScore}
            onChange={(e) => {
              setAwayScore(e.target.value);
              scheduleSave(e.target.value, homeScore);
            }}
            className="w-16 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-center text-neutral-100 disabled:opacity-50"
          />
        </div>
        <span className="pb-2 text-sm text-neutral-600">-</span>
        <div className="flex flex-col items-center">
          <label htmlFor={`home-${gameId}`} className="text-xs text-neutral-500">
            {homeAbbrev}
          </label>
          <input
            id={`home-${gameId}`}
            type="number"
            min={0}
            disabled={locked}
            value={homeScore}
            onChange={(e) => {
              setHomeScore(e.target.value);
              scheduleSave(awayScore, e.target.value);
            }}
            className="w-16 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-center text-neutral-100 disabled:opacity-50"
          />
        </div>
      </div>
      <span className="pb-2 text-center text-[11px]">
        {locked ? (
          <span className="text-neutral-600">🔒 Verrouillé</span>
        ) : status === "saving" ? (
          <span className="text-neutral-500">Enregistrement…</span>
        ) : status === "saved" ? (
          <span className="text-emerald-400">✓ Enregistré</span>
        ) : status === "error" ? (
          <span className="text-red-400">Erreur</span>
        ) : (
          <span className="text-neutral-700">&nbsp;</span>
        )}
      </span>
    </div>
  );
}
