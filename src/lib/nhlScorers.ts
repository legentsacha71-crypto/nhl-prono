// Liste statique des favoris pour le pick "Meilleur buteur de la saison".
// À mettre à jour à la main chaque saison si besoin (trades, retraites, etc.),
// comme la liste des équipes dans nhlTeams.ts.
//
// Les points attribués en cas de bonne réponse varient selon la probabilité
// estimée du joueur : plus il est outsider (probabilité faible), plus la
// récompense est élevée. Valeurs fixées manuellement par l'admin, sur le
// même principe que le barème utilisé pour les pronos de match.
export type TopScorerCandidate = {
  name: string;
  probability: number; // probabilité estimée en %, à titre indicatif
  points: number; // points attribués si ce joueur devient meilleur buteur
};

export const TOP_SCORER_CANDIDATES: TopScorerCandidate[] = [
  { name: "Nathan MacKinnon", probability: 12, points: 100 },
  { name: "Auston Matthews", probability: 10, points: 120 },
  { name: "Leon Draisaitl", probability: 10, points: 120 },
  { name: "Connor McDavid", probability: 8, points: 150 },
  { name: "David Pastrnak", probability: 7, points: 170 },
  { name: "Nikita Kucherov", probability: 6, points: 200 },
  { name: "Kirill Kaprizov", probability: 5, points: 240 },
  { name: "Alex Ovechkin", probability: 5, points: 240 },
  { name: "Mikko Rantanen", probability: 4, points: 300 },
  { name: "William Nylander", probability: 4, points: 300 },
  { name: "Jack Hughes", probability: 3.5, points: 340 },
  { name: "Artemi Panarin", probability: 3, points: 400 },
  { name: "Matthew Tkachuk", probability: 3, points: 400 },
  { name: "Sebastian Aho", probability: 2.5, points: 480 },
  { name: "Jason Robertson", probability: 2.5, points: 480 },
  { name: "Brady Tkachuk", probability: 2, points: 550 },
  { name: "Sidney Crosby", probability: 2, points: 550 },
  { name: "Elias Pettersson", probability: 2, points: 550 },
  { name: "Mitch Marner", probability: 1.5, points: 550 },
  { name: "Cale Makar", probability: 1, points: 550 },
];

export function getTopScorerPoints(playerName: string): number | undefined {
  return TOP_SCORER_CANDIDATES.find((c) => c.name === playerName)?.points;
}
