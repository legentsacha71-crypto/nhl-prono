// Anneaux cosmétiques affichés autour de la photo de profil, débloqués selon
// le total de points cumulés (pronos de match + pick coupe Stanley + pick
// meilleur buteur, soit le même total que celui utilisé pour le classement
// général). Les seuils sont une première estimation : comme la saison dure
// ~8 mois et que le barème permet de gros coups ponctuels (jusqu'à 550 pts
// pour un pick saisonnier), on privilégie des paliers hauts espacés pour que
// la progression dure toute la saison. À ajuster une fois de vraies données
// de saison disponibles — il suffit de changer les nombres ci-dessous, pas
// besoin de migration SQL.
export type ProfileRingTier = {
  key: string;
  label: string;
  threshold: number;
  image: string;
};

export const PROFILE_RING_TIERS: ProfileRingTier[] = [
  { key: "bronze", label: "Bronze", threshold: 0, image: "/rings/ring-bronze.png" },
  { key: "argent", label: "Argent", threshold: 600, image: "/rings/ring-argent.png" },
  { key: "or", label: "Or", threshold: 1500, image: "/rings/ring-or.png" },
  { key: "diamant", label: "Diamant", threshold: 3000, image: "/rings/ring-diamant.png" },
  { key: "jade", label: "Jade", threshold: 5500, image: "/rings/ring-jade.png" },
  { key: "rubis", label: "Rubis", threshold: 9000, image: "/rings/ring-rubis.png" },
  { key: "violet", label: "Violet", threshold: 14000, image: "/rings/ring-violet.png" },
];

// Le palier Bronze est à 0 point : tout le monde a un anneau visible dès son
// premier chargement de profil, plutôt que rien tant qu'on n'a pas atteint
// un premier seuil.
export function getRingForPoints(points: number): ProfileRingTier {
  let current = PROFILE_RING_TIERS[0];
  for (const tier of PROFILE_RING_TIERS) {
    if (points >= tier.threshold) {
      current = tier;
    }
  }
  return current;
}

export function getNextRingTier(points: number): ProfileRingTier | null {
  return PROFILE_RING_TIERS.find((tier) => points < tier.threshold) ?? null;
}
