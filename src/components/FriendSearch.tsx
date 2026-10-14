"use client";

import { useEffect, useState } from "react";
import { Check, Search } from "lucide-react";
import RankAvatar from "@/components/RankAvatar";
import { sendFriendRequest } from "@/app/profil/actions";

export type FriendRelation = "friend" | "sent" | "received";

type Player = { id: string; username: string; avatarUrl: string | null };

// Recherche d'un joueur par pseudo (dès 2 lettres) avec un bouton Ajouter
// sur chaque suggestion. `relations` : lien déjà existant avec chaque
// joueur, pour ne pas proposer d'ajouter un ami ou une demande en cours.
export default function FriendSearch({ relations }: { relations: Record<string, FriendRelation> }) {
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [sent, setSent] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<{ id: string; message: string } | null>(null);

  const q = query.trim();

  useEffect(() => {
    if (q.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/players?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = (await res.json()) as { players: Player[] };
        setPlayers(data.players);
      } catch {
        // Recherche annulée (nouvelle frappe) ou réseau : on garde l'affichage.
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  async function add(player: Player) {
    setPending(player.id);
    setError(null);
    const formData = new FormData();
    formData.set("username", player.username);
    try {
      await sendFriendRequest(formData);
      setSent((current) => ({ ...current, [player.id]: true }));
    } catch (err) {
      setError({ id: player.id, message: err instanceof Error ? err.message : "Une erreur est survenue." });
    } finally {
      setPending(null);
    }
  }

  function action(player: Player) {
    const relation = sent[player.id] ? "sent" : relations[player.id];
    if (relation === "friend") {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
          <Check size={14} aria-hidden="true" />
          Ami
        </span>
      );
    }
    if (relation === "sent") return <span className="text-xs text-neutral-500">Demande envoyée</span>;
    if (relation === "received") return <span className="text-xs text-sky-300">T&apos;a demandé en ami</span>;
    return (
      <button
        type="button"
        onClick={() => add(player)}
        disabled={pending === player.id}
        className="rounded-full bg-sky-500 px-3.5 py-1.5 text-xs font-semibold text-neutral-950 transition-transform active:scale-95 disabled:opacity-60"
      >
        {pending === player.id ? "…" : "Ajouter"}
      </button>
    );
  }

  const results = q.length >= 2 ? players : null;

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950 px-3 transition-colors focus-within:border-sky-500/70">
        <Search size={18} className="shrink-0 text-neutral-500" aria-hidden="true" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pseudo de ton ami"
          aria-label="Chercher un joueur par pseudo"
          autoComplete="off"
          autoCapitalize="none"
          autoCorrect="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-neutral-100 placeholder:text-neutral-500"
          // Le contour de focus global (globals.css) est remplacé par la
          // bordure du champ.
          style={{ outline: "none" }}
        />
      </label>

      {results && (
        <ul className="divide-y divide-neutral-800 overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
          {results.length === 0 ? (
            <li className="p-3 text-center text-sm text-neutral-500">Aucun joueur avec ce pseudo.</li>
          ) : (
            results.map((player) => (
              <li key={player.id} className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <RankAvatar avatarUrl={player.avatarUrl} username={player.username} size={36} />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-neutral-100">
                    {player.username}
                  </span>
                  {action(player)}
                </div>
                {error?.id === player.id && <p className="mt-1 text-right text-xs text-red-400">{error.message}</p>}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
