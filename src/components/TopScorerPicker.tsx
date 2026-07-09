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

// Ancienne version : <form action={submitTopScorerPick}> avec un <select
// defaultValue={...}>. Après une sauvegarde, revalidatePath rafraîchit les
// données côté serveur mais React ne réapplique pas defaultValue sur un
// <select> déjà monté : à l'écran, la sélection semblait "disparaître"
// alors qu'elle était bien enregistrée en base. On garde maintenant l'état
// affiché dans React (source de vérité côté client), avec un bouton
// Sauvegarder explicite qui appelle la Server Action directement.
export default function TopScorerPicker({
  players,
  initialPlayer,
  submitPick,
}: TopScorerPickerProps) {
  const [selected, setSelected] = useState(initialPlayer ?? "");
  const [saved, setSaved] = useState(initialPlayer);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const selectedCandidate = players.find((p) => p.name === selected);

  function handleSave() {
    if (!selected) {
      setError("Choisis un joueur.");
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
          <option value="">Choisir un joueur…</option>
          {players.map((p) => (
            <option key={p.name} value={p.name}>
              {p.name} ({p.points} pts)
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
      {selectedCandidate && (
        <p className="text-xs text-neutral-500">
          S&apos;il devient meilleur buteur, tu gagnes{" "}
          <span className="font-medium text-sky-400">
            {selectedCandidate.points} points
          </span>{" "}
          (probabilité estimée : {selectedCandidate.probability}%).
        </p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
