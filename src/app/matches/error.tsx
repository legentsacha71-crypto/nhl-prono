"use client";

import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";

// Filet de sécurité pour tout ce qui échapperait encore au .catch() posé sur
// chaque source de données dans page.tsx (ex. une requête Supabase qui
// plante) : sans error.tsx, une erreur ici rendait tout l'onglet Matchs
// inaccessible (écran cassé, sans même la barre du bas pour changer
// d'onglet). unstable_retry() relance le rendu de la page sans recharger
// toute l'appli.
export default function MatchesError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 pt-28 pb-24 text-center">
      <Logo size="md" />
      <p className="text-neutral-300">
        Les matchs n&apos;ont pas pu être chargés.
      </p>
      <p className="text-sm text-neutral-500">
        Un site externe (NHL ou Ligue Magnus) est peut-être momentanément
        indisponible.
      </p>
      <button
        type="button"
        onClick={() => unstable_retry()}
        className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-sky-500 active:scale-[0.97]"
      >
        Réessayer
      </button>
      <BottomNav />
    </div>
  );
}
