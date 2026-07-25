"use client";

import { useEffect, useState } from "react";

// Animation d'intro affichée à l'ouverture de l'appli : la vidéo de motion
// design du logo (~1,5s, exportée depuis After Effects) joue en plein
// écran, puis s'efface en fondu pour révéler le contenu.
//
// Ce composant vit dans RootLayout, qui ne se remonte pas lors de la
// navigation côté client (App Router) : il ne se déclenche donc que sur un
// vrai lancement/rechargement de l'appli, jamais en changeant d'onglet.
// Vient en complément du launch screen natif iOS (statique, affiché avant
// même que la WebView ait chargé quoi que ce soit).
export default function AppSplash() {
  // L'état initial est toujours "playing", identique côté serveur et
  // client (pas de dépendance à `window` dans le rendu) : ça évite tout
  // écart d'hydratation. La préférence prefers-reduced-motion et le filet
  // de sécurité (vidéo bloquée/en erreur) sont gérés après coup, dans
  // l'effect, via un court délai plutôt qu'un setState synchrone.
  const [phase, setPhase] = useState<"playing" | "fading" | "done">(
    "playing",
  );

  useEffect(() => {
    if (phase !== "playing") return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Si l'utilisateur préfère moins d'animations, on passe quasi
    // immédiatement au fondu de sortie plutôt que de jouer la vidéo en
    // entier. Sinon, filet de sécurité : si la vidéo ne se termine jamais
    // (lecture bloquée par le navigateur, erreur de chargement...), on ne
    // bloque pas l'appli indéfiniment derrière l'écran d'intro.
    const safety = setTimeout(
      () => setPhase("fading"),
      reduceMotion ? 0 : 3000,
    );
    return () => clearTimeout(safety);
  }, [phase]);

  useEffect(() => {
    if (phase !== "fading") return;
    const toDone = setTimeout(() => setPhase("done"), 300);
    return () => clearTimeout(toDone);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[60] flex items-center justify-center overflow-hidden bg-neutral-950 transition-opacity duration-300 ease-in ${
        phase === "fading" ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <video
        className="h-full w-full object-cover"
        src="/videos/splash-intro.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={() => setPhase("fading")}
        onError={() => setPhase("fading")}
      />
    </div>
  );
}
