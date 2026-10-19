"use client";

import { useLayoutEffect, useRef } from "react";
import { hapticTap } from "@/lib/native";

// Nombre affiché façon machine à sous : chaque chiffre est un rouleau qui
// tourne plusieurs fois puis s'arrête sur sa valeur, de gauche à droite,
// avec un petit rebond. Sans animation (play à false, ou « réduire les
// animations » activé), il s'affiche directement à sa valeur.

const SPINS = 2; // tours complets du premier rouleau (un de plus par rouleau)
const BASE_MS = 1100;
const STEP_MS = 260; // chaque rouleau s'arrête un peu après le précédent
const EASING = "cubic-bezier(0.12, 0.8, 0.25, 1.08)";

function digitsOf(n: number): number[] {
  return String(Math.max(0, Math.round(n))).split("").map(Number);
}

// Position finale d'un rouleau : son chiffre, dans le dernier tour.
function restingOffset(index: number, digit: number): number {
  return (SPINS + index) * 10 + digit;
}

export default function RollingNumber({
  value,
  from = 0,
  play,
  tick = false,
  className = "",
}: {
  value: number;
  from?: number;
  play: boolean;
  // Petite vibration à l'arrêt de chaque rouleau.
  tick?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const digits = digitsOf(value);

  // Avant l'affichage : les rouleaux repartent du nombre de départ, puis
  // tournent jusqu'au nombre final.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!play || !root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = digitsOf(value);
    const start = String(Math.max(0, Math.round(from)))
      .padStart(target.length, "0")
      .slice(-target.length)
      .split("")
      .map(Number);
    const strips = [...root.querySelectorAll<HTMLElement>("[data-strip]")];
    for (const [i, strip] of strips.entries()) {
      strip.style.transition = "none";
      strip.style.transform = `translateY(-${start[i]}em)`;
    }
    void root.offsetHeight; // applique la position de départ avant de lancer

    const timers: ReturnType<typeof setTimeout>[] = [];
    const frame = requestAnimationFrame(() => {
      for (const [i, strip] of strips.entries()) {
        const duration = BASE_MS + i * STEP_MS;
        strip.style.transition = `transform ${duration}ms ${EASING}`;
        strip.style.transform = `translateY(-${restingOffset(i, target[i])}em)`;
        if (tick) timers.push(setTimeout(() => void hapticTap(), duration - 60));
      }
    });
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
    };
  }, [play, value, from, tick]);

  return (
    <span ref={ref} className={`inline-flex items-start ${className}`}>
      <span className="sr-only">{Math.round(value)}</span>
      {digits.map((digit, i) => (
        <span
          key={`${digits.length}-${i}`}
          aria-hidden="true"
          className="relative inline-block h-[1em] overflow-hidden leading-none"
        >
          {/* Largeur d'un chiffre, pour que le nombre ne bouge pas. */}
          <span className="invisible">0</span>
          <span
            data-strip
            className="absolute inset-x-0 top-0 flex flex-col items-center"
            style={{ transform: `translateY(-${restingOffset(i, digit)}em)` }}
          >
            {Array.from({ length: (SPINS + i + 1) * 10 }, (_, k) => (
              <span key={k} className="block h-[1em] leading-none">
                {k % 10}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}
