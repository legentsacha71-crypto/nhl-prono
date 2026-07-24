"use client";

import { useState, useTransition } from "react";

type StanleyCupPickerOption = {
  abbrev: string;
  label: string;
  points: number;
  probability?: number;
};

type StanleyCupPickerProps = {
  options: StanleyCupPickerOption[];
  initialTeam: string | null;
  submitPick: (teamAbbrev: string) => Promise<void>;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

// Sélection = sauvegarde immédiate (plus de bouton "Sauvegarder", même
// logique que PredictionForm pour les scores). L'état affiché reste géré
// côté client pour éviter le bug où un <select defaultValue={...}> ne se
// remettait pas à jour visuellement après une sauvegarde côté serveur.
export default function StanleyCupPicker({
  options,
  initialTeam,
  submitPick,
}: StanleyCupPickerProps) {
  const [selected, setSelected] = useState(initialTeam ?? "");
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [isPending, startTransition] = useTransition();

  const selectedOption = options.find((o) => o.abbrev === selected);

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
        <option value="">Choisir une équipe…</option>
        {options.map((o) => (
          <option key={o.abbrev} value={o.abbrev}>
            {o.label} ({o.points} pts)
          </option>
        ))}
      </select>
      {statusContent && <p className="text-xs">{statusContent}</p>}
      {selectedOption && (
        <p className="text-xs text-neutral-500">
          Si elle gagne la coupe, tu gagnes{" "}
          <span className="font-medium text-sky-400">
            {selectedOption.points} points
          </span>
          {selectedOption.probability !== undefined &&
            ` (probabilité estimée : ${selectedOption.probability}%)`}
          .
        </p>
      )}
    </div>
  );
}
