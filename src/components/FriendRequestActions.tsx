"use client";

import { useState, useTransition } from "react";

type Status = "idle" | "error";

type FriendRequestActionsProps = {
  friendshipId: string;
  respondToFriendRequest: (formData: FormData) => Promise<void>;
};

// Boutons Accepter/Refuser d'une demande d'ami, utilisés à la fois sur la
// page profil et sur la page notifications. En cas d'erreur (ex. demande
// déjà traitée ailleurs), on affiche un message au lieu de laisser
// Next.js planter sur sa page d'erreur générique (pas de error.tsx).
export default function FriendRequestActions({
  friendshipId,
  respondToFriendRequest,
}: FriendRequestActionsProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function respond(action: "accept" | "decline") {
    const formData = new FormData();
    formData.set("friendshipId", friendshipId);
    formData.set("action", action);

    startTransition(async () => {
      try {
        await respondToFriendRequest(formData);
        // Pas besoin de repasser status à "idle" : revalidatePath() fait
        // disparaître cette carte de la liste une fois la demande traitée.
      } catch (err) {
        setStatus("error");
        setMessage(
          err instanceof Error ? err.message : "Une erreur est survenue.",
        );
      }
    });
  }

  return (
    <div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={() => respond("accept")}
          className={`rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white transition-colors duration-150 hover:bg-sky-500 ${
            isPending ? "cursor-not-allowed opacity-60" : ""
          }`}
        >
          {isPending ? "…" : "Accepter"}
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={() => respond("decline")}
          className={`rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 transition-colors duration-150 hover:border-neutral-600 hover:bg-neutral-900 ${
            isPending ? "cursor-not-allowed opacity-60" : ""
          }`}
        >
          Refuser
        </button>
      </div>
      {status === "error" && (
        <p className="mt-1 text-xs text-red-400">{message}</p>
      )}
    </div>
  );
}
