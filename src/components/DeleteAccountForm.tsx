"use client";

import { useState } from "react";
import SubmitButton from "./SubmitButton";

type DeleteAccountFormProps = {
  deleteAccount: () => Promise<void>;
};

const CONFIRM_WORD = "SUPPRIMER";

// Suppression de compte : action irréversible, donc protégée par une étape
// de confirmation explicite (saisir un mot précis) plutôt qu'un simple
// clic, pour éviter les suppressions accidentelles.
export default function DeleteAccountForm({
  deleteAccount,
}: DeleteAccountFormProps) {
  const [expanded, setExpanded] = useState(false);
  const [confirmText, setConfirmText] = useState("");

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="text-xs text-neutral-500 underline-offset-2 transition-colors duration-150 hover:text-red-400 hover:underline"
      >
        Supprimer mon compte
      </button>
    );
  }

  return (
    <form action={deleteAccount} className="space-y-2">
      <p className="text-xs text-neutral-400">
        Cette action est <span className="font-semibold text-red-400">définitive</span> :
        ton profil, tes pronostics, tes amitiés et tes messages seront
        supprimés. Tape{" "}
        <span className="font-mono font-semibold text-neutral-200">
          {CONFIRM_WORD}
        </span>{" "}
        pour confirmer.
      </p>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder={CONFIRM_WORD}
          className="min-w-0 flex-1 rounded-md border border-red-900 bg-neutral-950 p-2 text-sm text-neutral-100 placeholder:text-neutral-600 transition-colors focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500/50"
        />
        <SubmitButton
          disabled={confirmText !== CONFIRM_WORD}
          className="shrink-0 rounded-md bg-red-700 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-red-950/40 transition-all duration-150 hover:bg-red-600 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Supprimer définitivement
        </SubmitButton>
      </div>
      <button
        type="button"
        onClick={() => {
          setExpanded(false);
          setConfirmText("");
        }}
        className="text-xs text-neutral-500 hover:text-neutral-300"
      >
        Annuler
      </button>
    </form>
  );
}
