"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import { deleteLeague } from "@/app/leagues/actions";

// Suppression d'une ligue par son créateur, en deux temps pour éviter un
// appui malheureux : le bouton ouvre une confirmation.
export default function DeleteLeagueButton({
  leagueId,
  leagueName,
  memberCount,
}: {
  leagueId: string;
  leagueName: string;
  memberCount: number;
}) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="mx-auto flex items-center gap-1.5 text-xs text-neutral-500 transition-colors hover:text-red-400 active:scale-[0.97]"
      >
        <Trash2 size={14} aria-hidden="true" />
        Supprimer la ligue
      </button>
    );
  }

  const others = memberCount - 1;
  return (
    <form action={deleteLeague} className="space-y-3 rounded-2xl border border-red-900/60 bg-red-950/30 p-4 text-center">
      <input type="hidden" name="leagueId" value={leagueId} />
      <p className="text-sm text-neutral-300">
        Supprimer <span className="font-semibold text-neutral-50">« {leagueName} »</span> pour de bon ?
        {others > 0
          ? ` Le classement et le chat disparaîtront pour les ${others} autre${others > 1 ? "s" : ""} membre${others > 1 ? "s" : ""}, qui seront prévenus.`
          : " Le chat sera perdu."}{" "}
        Les points de chacun ne changent pas.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="flex-1 rounded-xl border border-neutral-700 py-2.5 text-sm font-semibold text-neutral-200 active:scale-[0.98]"
        >
          Annuler
        </button>
        <SubmitButton
          pendingText="Suppression…"
          className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white active:scale-[0.98]"
        >
          Supprimer
        </SubmitButton>
      </div>
    </form>
  );
}
