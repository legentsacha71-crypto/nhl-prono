"use client";

import { useEffect, useState } from "react";
import RollingNumber, { rollDuration } from "@/components/RollingNumber";
import { hapticSuccess } from "@/lib/native";
import { announceRoll } from "@/lib/pointsRoll";

// Points de l'accueil en rouleaux de machine à sous (RollingNumber). Ils ne
// tournent que quand le joueur a gagné des points depuis la dernière fois
// qu'il les a vus sur ce téléphone (à l'ouverture de l'appli, ou quand ils
// arrivent pendant qu'il est sur l'accueil). Sinon, ils restent fixes.
// Avec `showGain`, un « +45 » apparaît à droite du nombre puis retombe dedans
// en arc en s'effaçant ; quand il a presque disparu, le nombre encaisse le
// coup (petit gonflement lumineux) et les rouleaux partent. Si le gain
// contient un score exact (`exactCount` a augmenté), le « +45 » est doré avec
// 🎯 et l'animation finit sur une vibration de victoire.

// Moment où le « +45 » finit de se fondre dans les chiffres (voir
// gain-arc-* dans globals.css, 1000 ms au total).
const MERGE_DELAY_MS = 940;

type Roll = { value: number; from: number; play: boolean; gain: number; exact: boolean };

function seenKey(id: string) {
  return `lnh-points-vus:${id}`;
}
function exactKey(id: string) {
  return `lnh-exacts-vus:${id}`;
}

function rollTo(value: number, from: number, exact = false): Roll {
  const play = value > from;
  return { value, from, play, gain: play ? value - from : 0, exact: play && exact };
}

function firstRoll(id: string, value: number, exactCount: number | undefined): Roll {
  if (typeof window === "undefined") return rollTo(value, value);
  try {
    const stored = localStorage.getItem(seenKey(id));
    // Premier passage sur ce téléphone : rien à comparer, pas d'animation.
    if (stored === null) return rollTo(value, value);
    const storedExact = localStorage.getItem(exactKey(id));
    const exact = exactCount !== undefined && storedExact !== null && exactCount > Number(storedExact);
    return rollTo(value, Number(stored), exact);
  } catch {
    return rollTo(value, value);
  }
}

export default function PointsCounter({
  id,
  value,
  exactCount,
  tick = false,
  showGain = false,
  className,
}: {
  // Distingue les compteurs (total, NHL, Magnus) et les joueurs.
  id: string;
  value: number;
  // Nombre de scores exacts du joueur, pour dorer le « +45 ».
  exactCount?: number;
  tick?: boolean;
  showGain?: boolean;
  className?: string;
}) {
  const [roll, setRoll] = useState<Roll>(() => firstRoll(id, value, exactCount));
  const [exactSeen, setExactSeen] = useState(exactCount);

  // Nouveaux points pendant que l'accueil est affiché (page rafraîchie).
  if (roll.value !== value) {
    const exact = exactCount !== undefined && exactSeen !== undefined && exactCount > exactSeen;
    setRoll(rollTo(value, roll.value, exact));
    setExactSeen(exactCount);
  }

  useEffect(() => {
    try {
      localStorage.setItem(seenKey(id), String(value));
      if (exactCount !== undefined) localStorage.setItem(exactKey(id), String(exactCount));
    } catch {
      // Stockage indisponible : les points s'affichent sans animation.
    }
  }, [id, value, exactCount]);

  // Fin de l'animation : prévient l'alerte du haut, et vibration de victoire
  // pour un score exact.
  const total = roll.play ? (showGain ? MERGE_DELAY_MS : 0) + rollDuration(roll.value, roll.from) : 0;
  useEffect(() => {
    if (!showGain || total === 0) return;
    announceRoll(total);
    if (!roll.exact) return;
    const timer = setTimeout(() => void hapticSuccess(), total);
    return () => clearTimeout(timer);
  }, [showGain, total, roll.exact, roll.value]);

  const animating = showGain && roll.play;
  return (
    <span
      key={animating ? roll.value : undefined}
      className={`relative inline-block ${animating ? "animate-gain-hit" : ""}`}
      style={animating ? { animationDelay: `${MERGE_DELAY_MS - 100}ms` } : undefined}
    >
      <RollingNumber
        value={roll.value}
        from={roll.from}
        play={roll.play}
        tick={tick && roll.play && !roll.exact}
        // Les points NHL / Magnus partent en même temps que le total.
        delay={roll.play ? MERGE_DELAY_MS : 0}
        className={className}
      />
      {showGain && roll.gain > 0 && (
        <span
          key={roll.value}
          aria-hidden="true"
          onAnimationEnd={() => setRoll((r) => ({ ...r, gain: 0 }))}
          className={`animate-gain-arc-x pointer-events-none absolute left-full top-1/2 whitespace-nowrap font-display text-3xl leading-none ${
            roll.exact
              ? "text-amber-300 drop-shadow-[0_0_12px_rgba(251,191,36,0.7)]"
              : "text-sky-300 drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]"
          }`}
        >
          <span className="animate-gain-arc-y block">
            <span className="animate-gain-fade block">
              +{roll.gain}
              {roll.exact && " 🎯"}
            </span>
          </span>
        </span>
      )}
    </span>
  );
}
