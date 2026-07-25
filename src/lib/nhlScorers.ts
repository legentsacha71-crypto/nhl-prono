// Liste statique des favoris pour le pick "Meilleur buteur de la saison".
// À mettre à jour à la main chaque saison si besoin (trades, retraites, etc.),
// comme la liste des équipes dans nhlTeams.ts.
//
// Mise à jour juillet 2026 : liste élargie à 50 joueurs, probabilités
// recalibrées à partir des classements réels de la saison 2025-26 (buts
// marqués) et des principaux transferts de l'intersaison (ex. Marner →
// Vegas, Rantanen → Dallas, M. Tkachuk → Florida, Miller → NY Rangers).
//
// Les points attribués en cas de bonne réponse varient selon la probabilité
// estimée du joueur : plus il est outsider (probabilité faible), plus la
// récompense est élevée. Valeurs fixées manuellement par l'admin, sur le
// même principe que le barème utilisé pour les pronos de match (points ≈
// 1200 / probabilité, arrondis à la dizaine, plafonnés à 550).
export type TopScorerCandidate = {
  name: string;
  probability: number; // probabilité estimée en %, à titre indicatif
  points: number; // points attribués si ce joueur devient meilleur buteur
};

export const TOP_SCORER_CANDIDATES: TopScorerCandidate[] = [
  { name: "Nathan MacKinnon", probability: 12, points: 100 },
  { name: "Connor McDavid", probability: 10, points: 120 },
  { name: "Nikita Kucherov", probability: 8, points: 150 },
  { name: "Leon Draisaitl", probability: 8, points: 150 },
  { name: "Auston Matthews", probability: 7, points: 170 },
  { name: "Cole Caufield", probability: 6, points: 200 },
  { name: "Kirill Kaprizov", probability: 6, points: 200 },
  { name: "David Pastrnak", probability: 5, points: 240 },
  { name: "Macklin Celebrini", probability: 5, points: 240 },
  { name: "Mikko Rantanen", probability: 4.5, points: 270 },
  { name: "William Nylander", probability: 4, points: 300 },
  { name: "Artemi Panarin", probability: 4, points: 300 },
  { name: "Matthew Tkachuk", probability: 4, points: 300 },
  { name: "Mitch Marner", probability: 3.5, points: 340 },
  { name: "Jason Robertson", probability: 3.5, points: 340 },
  { name: "Steven Stamkos", probability: 3, points: 400 },
  { name: "Matt Boldy", probability: 3, points: 400 },
  { name: "Alex DeBrincat", probability: 2.5, points: 480 },
  { name: "Filip Forsberg", probability: 2.5, points: 480 },
  { name: "Jack Hughes", probability: 2.5, points: 480 },
  { name: "Elias Pettersson", probability: 2, points: 550 },
  { name: "Sebastian Aho", probability: 2, points: 550 },
  { name: "Brady Tkachuk", probability: 2, points: 550 },
  { name: "Sidney Crosby", probability: 2, points: 550 },
  { name: "Alex Ovechkin", probability: 2, points: 550 },
  { name: "Jake Guentzel", probability: 1.5, points: 550 },
  { name: "Brayden Point", probability: 1.5, points: 550 },
  { name: "Jack Eichel", probability: 1.5, points: 550 },
  { name: "Martin Necas", probability: 1.5, points: 550 },
  { name: "Dylan Larkin", probability: 1.5, points: 550 },
  { name: "Tage Thompson", probability: 1.5, points: 550 },
  { name: "Dylan Guenther", probability: 1.5, points: 550 },
  { name: "Kyle Connor", probability: 1.5, points: 550 },
  { name: "Wyatt Johnston", probability: 1.5, points: 550 },
  { name: "Mark Scheifele", probability: 1.2, points: 550 },
  { name: "Brandon Hagel", probability: 1.2, points: 550 },
  { name: "Adrian Kempe", probability: 1, points: 550 },
  { name: "Cutter Gauthier", probability: 1, points: 550 },
  { name: "Pavel Dorofeyev", probability: 1, points: 550 },
  { name: "Morgan Geekie", probability: 1, points: 550 },
  { name: "Sam Reinhart", probability: 1, points: 550 },
  { name: "Timo Meier", probability: 0.8, points: 550 },
  { name: "Jesper Bratt", probability: 0.8, points: 550 },
  { name: "Robert Thomas", probability: 0.8, points: 550 },
  { name: "Mathew Barzal", probability: 0.8, points: 550 },
  { name: "Zach Hyman", probability: 0.8, points: 550 },
  { name: "Nazem Kadri", probability: 0.6, points: 550 },
  { name: "Connor Bedard", probability: 0.6, points: 550 },
  { name: "Clayton Keller", probability: 0.6, points: 550 },
  { name: "Cale Makar", probability: 0.5, points: 550 },
];

export function getTopScorerPoints(playerName: string): number | undefined {
  return TOP_SCORER_CANDIDATES.find((c) => c.name === playerName)?.points;
}
