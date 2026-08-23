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
      <span className="text-neutral-400">Enregistrement…</span>
    ) : status === "saved" ? (
      <span className="text-emerald-400">✓ Enregistré</span>
    ) : status === "error" ? (
      <span className="text-red-400">Erreur, réessaie</span>
    ) : null;

  // Petit bouton crayon en surimpression sur l'avatar plutôt qu'un lien
  // texte séparé sous la photo : ça évite une ligne de plus dans la hero
  // section et se rapproche du geste "modifier ma photo" habituel des
  // apps mobiles.
  return (
    <div className="relative">
      <label
        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-neutral-950 bg-sky-600 text-xs text-white shadow-md shadow-black/40 transition-colors duration-150 hover:bg-sky-500 ${
          isPending ? "pointer-events-none opacity-50" : "cursor-pointer"
        }`}
        aria-label="Changer la photo de profil"
      >
        ✎
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
      {statusContent && (
        <p className="absolute top-full left-1/2 mt-1.5 w-max -translate-x-1/2 text-[10px] whitespace-nowrap">
          {statusContent}
        </p>
      )}
    </div>
  );
}
