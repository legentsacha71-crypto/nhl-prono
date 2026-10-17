"use client";

import { useEffect, useState, type ReactNode } from "react";

// Fenêtre qui glisse depuis le bas de l'écran, façon appli native, pour les
// questions posées à l'ouverture (notifications, mise à jour). Elle se ferme
// uniquement par ses boutons : toucher le fond ne fait rien.
export default function BottomSheet({ labelledBy, children }: { labelledBy: string; children: ReactNode }) {
  const [shown, setShown] = useState(false);

  // Entrée en glissant, et pas de défilement de la page dessous.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center">
      <div
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative w-full max-w-md rounded-t-3xl border-t border-neutral-800 bg-neutral-900 px-6 pt-7 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-2xl shadow-black/60 transition-transform duration-300 ease-out ${
          shown ? "translate-y-0" : "translate-y-full"
        }`}
      >
        {children}
      </div>
    </div>
  );
}
