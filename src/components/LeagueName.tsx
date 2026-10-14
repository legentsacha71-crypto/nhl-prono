"use client";

import { useState, type FormEvent } from "react";
import { Check, Pencil, X } from "lucide-react";
import { renameLeague } from "@/app/leagues/actions";
import { LEAGUE_NAME_MAX } from "@/lib/leagueName";

// Nom de la ligue en titre ; son créateur peut le modifier sur place avec
// le crayon (Entrée pour valider, la croix pour annuler).
export default function LeagueName({
  leagueId,
  name: initialName,
  canEdit,
}: {
  leagueId: string;
  name: string;
  canEdit: boolean;
}) {
  const [name, setName] = useState(initialName);
  const [draft, setDraft] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    const next = draft.trim();
    if (!next || next === name) {
      setEditing(false);
      setDraft(name);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await renameLeague(leagueId, next);
      setName(saved);
      setDraft(saved);
      setEditing(false);
    } catch {
      setError("Nom non enregistré, réessaie.");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="truncate text-2xl font-black italic tracking-tight text-neutral-50">{name}</h1>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="Renommer la ligue"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100 active:scale-95"
          >
            <Pencil size={15} aria-hidden="true" />
          </button>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={save} className="space-y-1">
      <div className="flex items-center gap-1.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={LEAGUE_NAME_MAX}
          autoFocus
          enterKeyHint="done"
          aria-label="Nouveau nom de la ligue"
          disabled={saving}
          className="min-w-0 flex-1 rounded-lg border border-sky-500/70 bg-neutral-950 px-2.5 py-1.5 text-lg font-bold italic text-neutral-50"
          style={{ outline: "none" }}
        />
        <button
          type="submit"
          disabled={saving || !draft.trim()}
          aria-label="Enregistrer le nom"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-neutral-950 active:scale-95 disabled:opacity-50"
        >
          <Check size={18} strokeWidth={2.5} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setDraft(name);
            setError(null);
          }}
          aria-label="Annuler"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-neutral-700 text-neutral-300 active:scale-95"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </form>
  );
}
