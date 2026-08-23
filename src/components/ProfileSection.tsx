import type { ReactNode } from "react";

type ProfileSectionProps = {
  title: string;
  right?: ReactNode;
  children: ReactNode;
};

// Bloc de section réutilisable pour les pages profil (le sien et celui
// d'un autre joueur) : une seule carte à bordure douce par thématique,
// plutôt qu'un empilement de titre + sous-cartes individuellement
// bordurées. Le but est de réduire le nombre de bordures visibles à
// l'écran pour un rendu plus "épuré", tout en gardant chaque thématique
// clairement délimitée.
export default function ProfileSection({
  title,
  right,
  children,
}: ProfileSectionProps) {
  return (
    <section className="rounded-2xl border border-neutral-800/80 bg-neutral-900/40 p-4 shadow-md shadow-black/10">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-semibold tracking-wide text-neutral-400 uppercase">
          {title}
        </h2>
        {right}
      </div>
      {children}
    </section>
  );
}
