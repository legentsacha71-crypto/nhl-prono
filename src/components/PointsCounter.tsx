"use client";

import { useEffect, useState } from "react";
import RollingNumber from "@/components/RollingNumber";

// Points de l'accueil en rouleaux de machine à sous (RollingNumber). Ils
// tournent à l'ouverture de l'appli, en partant du total vu la dernière fois
// sur ce téléphone, et dès que de nouveaux points arrivent. En revenant sur
// l'accueil pendant la même visite sans nouveaux points, ils restent fixes.

type Roll = { value: number; from: number; play: boolean };

function seenKey(id: string) {
  return `lnh-points-vus:${id}`;
}
function rolledKey(id: string) {
  return `lnh-points-tournes:${id}`;
}

function firstRoll(id: string, value: number): Roll {
  if (typeof window === "undefined") return { value, from: value, play: false };
  try {
    const stored = localStorage.getItem(seenKey(id));
    const previous = stored === null ? null : Number(stored);
    const firstThisLaunch = sessionStorage.getItem(rolledKey(id)) === null;
    const play = firstThisLaunch || previous !== value;
    return { value, from: previous ?? 0, play };
  } catch {
    return { value, from: value, play: false };
  }
}

export default function PointsCounter({
  id,
  value,
  tick = false,
  className,
}: {
  // Distingue les compteurs (total, NHL, Magnus) et les joueurs.
  id: string;
  value: number;
  tick?: boolean;
  className?: string;
}) {
  const [roll, setRoll] = useState<Roll>(() => firstRoll(id, value));

  // Nouveaux points pendant que l'accueil est affiché (page rafraîchie).
  if (roll.value !== value) setRoll({ value, from: roll.value, play: true });

  useEffect(() => {
    try {
      localStorage.setItem(seenKey(id), String(value));
      sessionStorage.setItem(rolledKey(id), "1");
    } catch {
      // Stockage indisponible : les points tourneront à chaque passage.
    }
  }, [id, value]);

  return (
    <RollingNumber
      value={roll.value}
      from={roll.from}
      play={roll.play}
      tick={tick && roll.value > roll.from}
      className={className}
    />
  );
}
