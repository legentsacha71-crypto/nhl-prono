"use client";

import { useRef, useState, useTransition } from "react";
import { resizeAvatar } from "@/lib/resizeAvatar";

type SaveStatus = "idle" | "saving" | "saved" | "error";

type AvatarUploadFormProps = {
  uploadAvatar: (formData: FormData) => Promise<{ error?: string }>;
};

// Renvoie le message d'erreur à afficher, ou null si tout s'est bien passé.
// La photo est réduite avant l'envoi : une photo de téléphone dépasse
// souvent la limite de 3 Mo et certains formats (HEIC...) sont refusés.
async function sendAvatar(
  file: File,
  uploadAvatar: AvatarUploadFormProps["uploadAvatar"],
): Promise<string | null> {
  let photo: File;
  try {
    photo = await resizeAvatar(file);
  } catch {
    return "Photo illisible (JPG, PNG ou WebP).";
  }

  const formData = new FormData();
  formData.set("avatar", photo);
  try {
    const { error } = await uploadAvatar(formData);
    return error ?? null;
  } catch {
    return "Erreur réseau, réessaie.";
  }
}

// Plus de bouton "Changer" séparé, ni de texte natif "aucun fichier
// choisi" : l'input file réel est masqué et déclenché par un bouton
// stylé, et sélectionner une image lance directement la sauvegarde
// (même logique d'auto-save que les autres formulaires de la page).
export default function AvatarUploadForm({
  uploadAvatar,
}: AvatarUploadFormProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    startTransition(async () => {
      setStatus("saving");
      const error = await sendAvatar(file, uploadAvatar);
      setErrorMessage(error);
      setStatus(error ? "error" : "saved");
      // Sans ça, resélectionner le même fichier une deuxième fois ne
      // redéclenche pas onChange (le navigateur ignore une valeur
      // inchangée).
      if (inputRef.current) inputRef.current.value = "";
    });
  }

  const statusContent =
    status === "saving" ? (
      <span className="text-neutral-400">Enregistrement…</span>
    ) : status === "saved" ? (
      <span className="text-emerald-400">✓ Enregistré</span>
    ) : status === "error" ? (
      <span className="text-red-400">{errorMessage ?? "Erreur, réessaie."}</span>
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
        <p className="absolute top-full left-1/2 mt-1.5 w-max max-w-52 -translate-x-1/2 text-center text-[10px]">
          {statusContent}
        </p>
      )}
    </div>
  );
}
