"use client";

import { useState, type ReactNode } from "react";

// Filtre Global / Domicile / Extérieur au-dessus du classement, comme sur
// Flashscore. Les vues sont rendues côté serveur ; on n'affiche que l'active.
export default function StandingsViews({
  views,
}: {
  views: { key: string; label: string; content: ReactNode }[];
}) {
  const [active, setActive] = useState(views[0]?.key);
  if (views.length === 0) return null;

  return (
    <div className="space-y-4">
      {views.length > 1 && (
        <div className="flex justify-center gap-1.5" role="group" aria-label="Filtrer le classement">
          {views.map((view) => (
            <button
              key={view.key}
              type="button"
              aria-pressed={active === view.key}
              onClick={() => setActive(view.key)}
              className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors active:scale-[0.97] ${
                active === view.key
                  ? "bg-neutral-100 text-neutral-900"
                  : "bg-neutral-800 text-neutral-400 hover:text-neutral-200"
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      )}
      {views.map((view) => (
        <div key={view.key} hidden={active !== view.key}>
          {view.content}
        </div>
      ))}
    </div>
  );
}
