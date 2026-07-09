"use client";

import { useState } from "react";
import { PROFILE_RING_TIERS } from "@/lib/profileRings";

// Même logique que FavoriteTeamPicker pour l'ouverture/fermeture : un state
// React explicite plutôt qu'un <details>/<summary>, plus fiable sur mobile.
export default function RingInfoBadge() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-label="Explication des paliers"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-neutral-600 text-[10px] font-bold leading-none text-neutral-400 transition-colors duration-150 hover:border-sky-500 hover:text-sky-400"
      >
        !
      </button>

      {isOpen && (
        <div className="absolute left-1/2 z-50 mt-2 w-64 -translate-x-1/2 rounded-xl border border-neutral-800 bg-neutral-950 p-3 text-left shadow-xl">
          <p className="mb-2 text-xs font-medium text-neutral-200">
            Paliers selon ton total de points (pronos + coupe Stanley +
            meilleur buteur) :
          </p>
          <ul className="space-y-1 text-xs">
            {PROFILE_RING_TIERS.map((tier) => (
              <li
                key={tier.key}
                className="flex items-center justify-between text-neutral-400"
              >
                <span>{tier.label}</span>
                <span className="text-neutral-500">{tier.threshold} pts</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
