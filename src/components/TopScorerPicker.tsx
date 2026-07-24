"use client";

import { useState, useTransition } from "react";

type TopScorerCandidate = {
  name: string;
  probability: number;
  points: number;
};

type TopScorerPickerProps = {
  players: TopScorerCandidate[];
  initialPlayer: string | null;
  submitPick: (playerName: string) => Promise<void>;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

// Sélection = sauvegarde immédiate (plus de bouton "Sauvegarder", même
// logique que PredictionForm pour les scores). L'état affiché reste géré
// côté client pour éviter le bug où un <select defaultValue={...}> ne se
// remettait pas à jour visuellement après une sauvegarde côté serveur.
export default function TopScorerPicker({
  players,
  initialPlayer,
  submitPick,
}: TopScorerPickerProps) {
  const [selected, setSelected] = useState(initialPlayer ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [isPending, startTransition] = useTransition();

  const selectedCandidate = players.find((p) => p.name === selected);

  function handleChange(next: string) {
    setSelected(next);
    if (!next) {
      setStatus("idle");
      return;
    }
    startTransition(async () => {
      setStatus("saving");
      try {
        await submitPick(next);
        setStatus("saved");
      } catch {
        setStatus("error");
      }
    });
  }

  const statusContent =
    status === "saving" ? (
      <span className="text-neutral-500">Enregistrement…</span>
    ) : status === "saved" ? (
      <span className="text-emerald-400">✓ Enregistré</span>
    ) : status === "error" ? (
      <span className="text-red-400">Erreur, réessaie</span>
    ) : null;

  return (
    <div className="flex flex-col gap-1">
      <select
        value={selected}
        onChange={(e) => handleChange(e.target.value)}
        disabled={isPending}
        className="w-full rounded-md border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-100 transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 disabled:opacity-50"
      >
        <option value="">Choisir un joueur…</option>
        {players.map((p) => (
          <option key={p.name} value={p.name}>
            {p.name} ({p.points} pts)
          </option>
        ))}
      </select>
      {statusContent && <p className="text-xs">{statusContent}</p>}
      {selectedCandidate && (
        <p className="text-xs text-neutral-500">
          S&apos;il devient meilleur buteur, tu gagnes{" "}
          <span className="font-medium text-sky-400">
            {selectedCandidate.points} points
          </span>{" "}
          (probabilité estimée : {selectedCandidate.probability}%).
        </p>
      )}
    </div>
  );
}
