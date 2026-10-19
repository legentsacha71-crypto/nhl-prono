"use client";

import { useLayoutEffect, useRef } from "react";
import { hapticTap } from "@/lib/native";

// Nombre affiché façon machine à sous : chaque chiffre est un rouleau. Quand
// le nombre change, seuls les chiffres qui bougent tournent (comme un
// compteur), plusieurs fois, puis s'arrêtent sur leur valeur de gauche à
// droite avec un petit rebond. Sans animation (play à false, ou « réduire
// les animations » activé), il s'affiche directement à sa valeur.

const SPINS = 1; // tours complets du premier rouleau (un de plus par rouleau)
const BASE_MS = 850;
const STEP_MS = 180; // chaque rouleau s'arrête un peu après le précédent
const EASING = "cubic-bezier(0.12, 0.8, 0.25, 1.08)";

function digitsOf(n: number): number[] {
  return String(Math.max(0, Math.round(n))).split("").map(Number);
}

// Chiffres de départ alignés sur ceux d'arrivée, et nombre de chiffres
// ajoutés devant (990 → 1035 : un).
function startDigits(from: number, target: number[]): { start: number[]; added: number } {
  const text = String(Math.max(0, Math.round(from)));
  return {
    start: text.padStart(target.length, "0").slice(-target.length).split("").map(Number),
    added: Math.max(0, target.length - text.length),
  };
}

// Rouleaux qui tournent pour passer de `from` à `value`.
function movingReels(value: number, from: number): number[] {
  const target = digitsOf(value);
  const { start, added } = startDigits(from, target);
  return target.map((_, i) => i).filter((i) => i < added || start[i] !== target[i]);
}

// Durée de l'animation (le dernier rouleau arrêté), délai non compris.
export function rollDuration(value: number, from: number): number {
  const moving = movingReels(value, from).length;
  return moving === 0 ? 0 : BASE_MS + (moving - 1) * STEP_MS;
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
  delay = 0,
  className = "",
}: {
  value: number;
  from?: number;
  play: boolean;
  // Petite vibration à l'arrêt de chaque rouleau.
  tick?: boolean;
  // Attente avant que les rouleaux partent (le nombre de départ s'affiche
  // pendant ce temps).
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const digits = digitsOf(value);

  // Avant l'affichage : les rouleaux qui vont tourner repartent du nombre de
  // départ, puis tournent jusqu'au nombre final.
  useLayoutEffect(() => {
    const root = ref.current;
    if (!play || !root || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const target = digitsOf(value);
    const { start, added } = startDigits(from, target);
    const moving = movingReels(value, from);
    const strips = [...root.querySelectorAll<HTMLElement>("[data-strip]")];
    for (const i of moving) {
      const strip = strips[i];
      strip.style.transition = "none";
      strip.style.transform = `translateY(-${start[i]}em)`;
      // Chiffre ajouté devant : pas de « 0 » en attendant qu'il tourne.
      strip.style.opacity = i < added ? "0" : "1";
    }
    void root.offsetHeight; // applique la position de départ avant de lancer

    const timers: ReturnType<typeof setTimeout>[] = [];
    const launch = () => {
      for (const [k, i] of moving.entries()) {
        const strip = strips[i];
        const duration = BASE_MS + k * STEP_MS;
        strip.style.transition = `transform ${duration}ms ${EASING}, opacity 250ms ease-out`;
        strip.style.transform = `translateY(-${restingOffset(i, target[i])}em)`;
        strip.style.opacity = "1";
        if (tick) timers.push(setTimeout(() => void hapticTap(), duration - 60));
      }
    };
    const frame = delay > 0 ? null : requestAnimationFrame(launch);
    if (delay > 0) timers.push(setTimeout(launch, delay));
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
    };
  }, [play, value, from, tick, delay]);

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
