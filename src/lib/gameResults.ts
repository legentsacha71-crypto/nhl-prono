import { isMagnusGameId } from "./competition";
import { getGameResult as getNhlGameResult } from "./nhlResults";
import { getGameResult as getMagnusGameResult } from "./magnusResults";
import type { GameResult } from "./nhlResults";

export type { GameResult };

// Sélectionne la bonne source de résultat (NHL ou Ligue Magnus) à partir de
// la plage d'id du match (voir isMagnusGameId). Utilisé partout où on
// affiche ou note un pronostic passé sans savoir a priori de quelle
// compétition il vient (pages profil, cron /api/grade-games...).
export function getGameResult(gameId: number): Promise<GameResult> {
  return isMagnusGameId(gameId)
    ? getMagnusGameResult(gameId)
    : getNhlGameResult(gameId);
}
