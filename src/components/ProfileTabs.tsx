"use client";

import type { ReactNode } from "react";
import SlidingTabs from "@/components/SlidingTabs";

/**
 * Bascule "Général" / "Stats" de la page profil. Fine enveloppe autour de
 * SlidingTabs (logique de swipe/coulissement générique, aussi utilisée par
 * la page Matchs pour "À venir" / "Calendrier").
 */
export default function ProfileTabs({
  general,
  stats,
}: {
  general: ReactNode;
  stats: ReactNode;
}) {
  return (
    <SlidingTabs
      tabs={[
        { key: "general", label: "Général", content: general },
        { key: "stats", label: "Stats", content: stats },
      ]}
    />
  );
}
