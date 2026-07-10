"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = {
  children: ReactNode;
  pendingText?: ReactNode;
  className?: string;
  disabled?: boolean;
};

// Bouton de soumission générique pour les <form action={serverAction}>.
// Utilise useFormStatus (doit être un descendant du <form>, d'où "use client")
// pour désactiver le bouton et afficher un état "en cours" pendant l'appel
// réseau vers la Server Action, au lieu de laisser le bouton silencieux.
export default function SubmitButton({
  children,
  pendingText = "…",
  className,
  disabled,
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`${className ?? ""} ${
        pending ? "cursor-not-allowed opacity-60" : ""
      }`}
    >
      {pending ? pendingText : children}
    </button>
  );
}
