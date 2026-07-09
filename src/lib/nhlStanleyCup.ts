// Barème statique pour le pick "Vainqueur de la coupe Stanley", sur le même
// principe que nhlScorers.ts : les points attribués en cas de bonne réponse
// varient selon la probabilité estimée de l'équipe (cotes de pré-saison).
// Remplace l'ancienne version basée sur des cotes live (The Odds API), qui
// n'était souvent pas disponible avant l'approche de la saison.
//
// Les 3 équipes absentes des cotes de départ (Blues, Blackhawks, Kraken)
// sont incluses au plafond de points (550), au même titre que les plus gros
// outsiders.
export type StanleyCupCandidate = {
  abbrev: string;
  probability?: number; // probabilité estimée en %, à titre indicatif
  points: number; // points attribués si cette équipe gagne la coupe Stanley
};

export const STANLEY_CUP_CANDIDATES: StanleyCupCandidate[] = [
  { abbrev: "FLA", probability: 13.8, points: 87 },
  { abbrev: "CAR", probability: 12.9, points: 93 },
  { abbrev: "COL", probability: 12.5, points: 96 },
  { abbrev: "EDM", probability: 11.1, points: 108 },
  { abbrev: "VGK", probability: 10.5, points: 114 },
  { abbrev: "TBL", probability: 7.1, points: 168 },
  { abbrev: "MIN", probability: 6.3, points: 192 },
  { abbrev: "DAL", probability: 6.3, points: 192 },
  { abbrev: "WSH", probability: 5.3, points: 228 },
  { abbrev: "MTL", probability: 4.3, points: 276 },
  { abbrev: "ANA", probability: 3.4, points: 348 },
  { abbrev: "OTT", probability: 2.9, points: 408 },
  { abbrev: "BUF", probability: 2.9, points: 408 },
  { abbrev: "NJD", probability: 2.9, points: 408 },
  { abbrev: "LAK", probability: 2.9, points: 408 },
  { abbrev: "UTA", probability: 2.9, points: 408 },
  { abbrev: "SJS", probability: 2.9, points: 408 },
  { abbrev: "TOR", probability: 2.4, points: 492 },
  { abbrev: "PHI", probability: 2.0, points: 550 },
  { abbrev: "CBJ", probability: 1.5, points: 550 },
  { abbrev: "NYR", probability: 1.3, points: 550 },
  { abbrev: "BOS", probability: 1.0, points: 550 },
  { abbrev: "DET", probability: 1.0, points: 550 },
  { abbrev: "PIT", probability: 1.0, points: 550 },
  { abbrev: "WPG", probability: 0.7, points: 550 },
  { abbrev: "NYI", probability: 0.7, points: 550 },
  { abbrev: "NSH", probability: 0.7, points: 550 },
  { abbrev: "CGY", probability: 0.3, points: 550 },
  { abbrev: "VAN", probability: 0.2, points: 550 },
  { abbrev: "STL", points: 550 },
  { abbrev: "CHI", points: 550 },
  { abbrev: "SEA", points: 550 },
];

export function getStanleyCupPoints(abbrev: string): number | undefined {
  return STANLEY_CUP_CANDIDATES.find((c) => c.abbrev === abbrev)?.points;
}
