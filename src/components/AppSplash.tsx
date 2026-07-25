"use client";

import { useEffect, useState } from "react";

// Petite animation d'intro façon "motion design" affichée à l'ouverture de
// l'appli : "La Nuit" et "Hockey" apparaissent superposés au centre de
// l'écran, puis se séparent en sortant chacun par un bord opposé ("La
// Nuit" vers le haut, "Hockey" vers le bas) pour révéler le contenu.
//
// Ce composant vit dans RootLayout, qui ne se remonte pas lors de la
// navigation côté client (App Router) : il ne se déclenche donc que sur un
// vrai lancement/rechargement de l'appli, jamais en changeant d'onglet.
// Vient en complément du launch screen natif iOS (statique, affiché avant
// même que la WebView ait chargé quoi que ce soit).
export default function AppSplash() {
  const [phase, setPhase] = useState<"enter" | "visible" | "exit" | "done">(
    "enter",
  );

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const enterMs = reduceMotion ? 0 : 450;
    const holdMs = reduceMotion ? 150 : 550;
    const exitMs = reduceMotion ? 150 : 500;

    // Un léger décalage (rAF) est nécessaire pour que le passage de "enter"
    // à "visible" déclenche bien la transition CSS plutôt que de partir
    // directement dans l'état final (sinon le navigateur peut fusionner
    // les deux states du premier rendu et sauter l'animation d'entrée).
    const raf = requestAnimationFrame(() => setPhase("visible"));
    const toExit = setTimeout(() => setPhase("exit"), enterMs + holdMs);
    const toDone = setTimeout(
      () => setPhase("done"),
      enterMs + holdMs + exitMs,
    );

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(toExit);
      clearTimeout(toDone);
    };
  }, []);

  if (phase === "done") return null;

  const isVisible = phase === "visible" || phase === "exit";
  const isExiting = phase === "exit";

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-neutral-950"
    >
      <div className="relative h-14 w-full">
        <span
          className={`absolute inset-0 flex items-center justify-center font-display text-4xl uppercase tracking-wide text-sky-400 transition-all duration-500 ease-in ${
            isExiting ? "-translate-y-[130%]" : "translate-y-0"
          } ${isVisible ? "opacity-100" : "opacity-0"}`}
          style={{
            transitionDuration: isExiting ? "500ms" : "450ms",
            transitionTimingFunction: isExiting
              ? "cubic-bezier(0.55, 0, 1, 0.45)"
              : "ease-out",
          }}
        >
          La Nuit
        </span>
        <span
          className={`absolute inset-0 flex items-center justify-center font-display text-4xl uppercase tracking-wide text-neutral-50 transition-all duration-500 ease-in ${
            isExiting ? "translate-y-[130%]" : "translate-y-0"
          } ${isVisible ? "opacity-100" : "opacity-0"}`}
          style={{
            transitionDuration: isExiting ? "500ms" : "450ms",
            transitionTimingFunction: isExiting
              ? "cubic-bezier(0.55, 0, 1, 0.45)"
              : "ease-out",
          }}
        >
          Hockey
        </span>
      </div>
    </div>
  );
}
