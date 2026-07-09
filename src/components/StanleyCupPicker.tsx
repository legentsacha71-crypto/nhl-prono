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

// Même logique que TopScorerPicker : état affiché géré côté client pour
// éviter le bug où un <select defaultValue={...}> ne se remettait pas à
// jour visuellement après une sauvegarde côté serveur.
export default function StanleyCupPicker({
  options,
  initialTeam,
  submitPick,
}: StanleyCupPickerProps) {
  const [selected, setSelected] = useState(initialTeam ?? "");
  const [saved, setSaved] = useState(initialTeam);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedOption = options.find((o) => o.abbrev === selected);

  function handleSave() {
    if (!selected) {
      setError("Choisis une équipe.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await submitPick(selected);
        setSaved(selected);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erreur lors de la sauvegarde.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          disabled={isPending}
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-100 transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
        >
          <option value="">Choisir une équipe…</option>
          {options.map((o) => (
            <option key={o.abbrev} value={o.abbrev}>
              {o.label} ({o.points} pts)
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending || !selected || selected === saved}
          className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-md shadow-sky-950/40 transition-all duration-150 hover:bg-sky-500 active:scale-[0.97] disabled:opacity-50 disabled:hover:bg-sky-600 disabled:active:scale-100"
        >
          {isPending ? "…" : "Sauvegarder"}
        </button>
      </div>
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
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
