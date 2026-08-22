import {
  getAllSeasonMatches,
  getCurrentCompetitionId,
  isMatchAssigned,
  regulationScore,
} from "./magnusApi";
import type { GameResult } from "./nhlResults";

const NOT_FOUND_RESULT: GameResult = {
  isFinal: false,
  awayAbbrev: "",
  homeAbbrev: "",
  regulationAwayScore: 0,
  regulationHomeScore: 0,
};

// Même forme que getGameResult (nhlResults.ts), pour que le cron de
// notation (grade-games) et l'affichage "pronos récents" du profil
// traitent les deux compétitions de façon interchangeable — voir
// src/lib/gameResults.ts pour le dispatcher qui choisit entre les deux.
//
// Contrairement à la NHL, l'API Ligue Magnus n'a pas d'endpoint "un seul
// match par id" : on récupère donc tout le calendrier de la saison en
// cours (déjà mis en cache 60s par getAllSeasonMatches) et on cherche
// dedans, comme le fait déjà magnus.ts pour le calendrier affiché.
export async function getGameResult(gameId: number): Promise<GameResult> {
  const competitionId = await getCurrentCompetitionId();
  if (!competitionId) return NOT_FOUND_RESULT;

  const matches = await getAllSeasonMatches(competitionId, 60);
  const match = matches.find((m) => m.id === gameId);
  if (!match || !isMatchAssigned(match) || match.etat !== "T") {
    return NOT_FOUND_RESULT;
  }

  const { homeScore, awayScore } = regulationScore(match);

  return {
    isFinal: true,
    awayAbbrev: match.visiteur.abreviation,
    homeAbbrev: match.receveur.abreviation,
    regulationAwayScore: awayScore,
    regulationHomeScore: homeScore,
  };
}
