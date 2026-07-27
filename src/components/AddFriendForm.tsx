"use client";

import { useRef, useState, useTransition } from "react";

type Status = "idle" | "success" | "error";

type AddFriendFormProps = {
  sendFriendRequest: (formData: FormData) => Promise<void>;
};

// Avant, ce formulaire postait directement vers la Server Action sans
// aucun retour visuel : si sendFriendRequest levait une erreur (pseudo
// introuvable, demande déjà en attente, etc.), Next.js affichait sa page
// d'erreur générique par défaut (pas de error.tsx dans l'app) — ce qui
// donnait l'impression que "ça ne marche pas". On passe par useTransition
// + try/catch pour afficher le message d'erreur réel, ou une confirmation
// de succès, sans jamais casser la page.
export default function AddFriendForm({
  sendFriendRequest,
}: AddFriendFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        await sendFriendRequest(formData);
        setStatus("success");
        setMessage("Demande envoyée");
        formRef.current?.reset();
      } catch (err) {
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "Une erreur est survenue.",
        );
      }
    });
  }

  return (
    <div className="mb-3">
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="flex items-center gap-2"
      >
        <input
          name="username"
          type="text"
          placeholder="Pseudo de ton ami"
          required
          disabled={isPending}
          onChange={() => status !== "idle" && setStatus("idle")}
          className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isPending}
          className={`rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-sky-950/40 transition-all duration-150 hover:bg-sky-500 active:scale-[0.97] ${
            isPending ? "cursor-not-allowed opacity-60" : ""
          }`}
        >
          {isPending ? "…" : "Ajouter"}
        </button>
      </form>
      {status === "success" && (
        <p className="mt-1 text-xs text-emerald-400">✓ {message}</p>
      )}
      {status === "error" && (
        <p className="mt-1 text-xs text-red-400">{message}</p>
      )}
    </div>
  );
}
