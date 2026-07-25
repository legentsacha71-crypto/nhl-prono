"use client";

import { useRef, useState, useTransition } from "react";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type AvatarUploadFormProps = {
  uploadAvatar: (formData: FormData) => Promise<void>;
};

// Plus de bouton "Changer" séparé, ni de texte natif "aucun fichier
// choisi" : l'input file réel est masqué et déclenché par un bouton
// stylé, et sélectionner une image lance directement la sauvegarde
// (même logique d'auto-save que les autres formulaires de la page).
export default function AvatarUploadForm({
  uploadAvatar,
}: AvatarUploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.set("avatar", file);

    startTransition(async () => {
      setStatus("saving");
      try {
        await uploadAvatar(formData);
        setStatus("saved");
      } catch {
        setStatus("error");
      } finally {
        // Sans ça, resélectionner le même fichier une deuxième fois ne
        // redéclenche pas onChange (le navigateur ignore une valeur
        // inchangée).
        if (inputRef.current) inputRef.current.value = "";
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
    <div className="flex flex-col items-center gap-1">
      <label
        className={`rounded-md bg-neutral-800 px-2 py-1 text-xs font-medium text-neutral-200 transition-colors duration-150 hover:bg-neutral-700 ${
          isPending ? "pointer-events-none opacity-50" : "cursor-pointer"
        }`}
      >
        Changer la photo
        <input
          ref={inputRef}
          type="file"
          name="avatar"
          accept="image/png,image/jpeg,image/webp"
          disabled={isPending}
          onChange={handleChange}
          className="hidden"
        />
      </label>
      {statusContent && <p className="text-xs">{statusContent}</p>}
    </div>
  );
}
