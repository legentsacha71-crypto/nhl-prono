"use client";

import { useEffect, useState } from "react";

// Petite animation d'intro façon "motion design" affichée à l'ouverture de
// l'appli : le logo "La Nuit" / "Hockey" (deux lignes empilées, comme sur
// l'icône/le branding) apparaît en fondu, puis se scinde — "La Nuit" file
// vers le haut, "Hockey" vers le bas, jusqu'à sortir entièrement de
// l'écran (translation en vh, pas en % de la hauteur du texte) — avec une
// accélération douce et un fondu concentré sur la toute fin du parcours.
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

    // L'écran reste affiché brièvement, mais la sortie a besoin d'un peu
    // de temps pour rester fluide (les lignes parcourent tout l'écran).
    const enterMs = reduceMotion ? 0 : 300;
    const holdMs = reduceMotion ? 100 : 350;
    const exitMs = reduceMotion ? 100 : 650;

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

  // Transitions distinctes pour le transform et l'opacité en sortie : le
  // transform utilise une courbe d'accélération douce ("easeInCubic"), qui
  // reste fluide plutôt que de partir d'un coup sec, pendant que l'opacité
  // utilise une courbe encore plus tardive pour ne s'estomper qu'en toute
  // fin de course.
  const exitTransition =
    "transform 650ms cubic-bezier(0.55, 0.06, 0.68, 0.19), opacity 650ms cubic-bezier(0.8, 0, 1, 1)";
  const enterTransition = "transform 300ms ease-out, opacity 300ms ease-out";

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center overflow-hidden bg-neutral-950"
    >
      <span
        className={`font-sans text-6xl leading-[0.85] font-black tracking-tight text-neutral-50 italic uppercase ${
          isExiting
            ? "-translate-y-[80vh] scale-95 opacity-0"
            : isVisible
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-0 scale-95 opacity-0"
        }`}
        style={{ transition: isExiting ? exitTransition : enterTransition }}
      >
        La Nuit
      </span>
      <span
        className={`font-sans text-6xl leading-[0.85] font-black tracking-tight text-sky-400 italic uppercase ${
          isExiting
            ? "translate-y-[80vh] scale-95 opacity-0"
            : isVisible
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-0 scale-95 opacity-0"
        }`}
        style={{
          transition: isExiting ? exitTransition : enterTransition,
          textShadow: "0 0 22px rgba(56, 189, 248, 0.55)",
        }}
      >
        Hockey
      </span>
    </div>
  );
}
