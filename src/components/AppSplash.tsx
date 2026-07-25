"use client";

import { useEffect, useState } from "react";

// Petite animation d'intro façon "motion design" affichée à l'ouverture de
// l'appli (logo qui apparaît en zoom + fondu, puis tout l'écran s'efface
// pour révéler le contenu). Ce composant vit dans RootLayout, qui ne se
// remonte pas lors de la navigation côté client (App Router) : il ne se
// déclenche donc que sur un vrai lancement/rechargement de l'appli, jamais
// en changeant d'onglet. Vient en complément du launch screen natif iOS
// (statique, affiché avant même que la WebView ait chargé quoi que ce
// soit) : ici on prend le relais avec quelque chose d'un peu plus vivant.
export default function AppSplash() {
  const [phase, setPhase] = useState<"in" | "out" | "done">("in");

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const holdMs = reduceMotion ? 150 : 700;
    const fadeOutMs = reduceMotion ? 150 : 450;

    const toOut = setTimeout(() => setPhase("out"), holdMs);
    const toDone = setTimeout(() => setPhase("done"), holdMs + fadeOutMs);

    return () => {
      clearTimeout(toOut);
      clearTimeout(toDone);
    };
  }, []);

  if (phase === "done") return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[60] flex flex-col items-center justify-center gap-3 bg-neutral-950 transition-opacity duration-[450ms] ease-in ${
        phase === "out" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div
        className="flex h-20 w-20 items-center justify-center rounded-2xl bg-sky-700 text-3xl font-black italic text-white shadow-lg shadow-sky-950/50 motion-safe:animate-[splash-logo-in_0.5s_ease-out]"
        style={{ animationFillMode: "backwards" }}
      >
        LN
      </div>
      <p
        className="text-sm font-medium tracking-wide text-sky-100 motion-safe:animate-[splash-text-in_0.5s_ease-out_0.15s]"
        style={{ animationFillMode: "backwards" }}
      >
        La Nuit Hockey
      </p>
    </div>
  );
}
