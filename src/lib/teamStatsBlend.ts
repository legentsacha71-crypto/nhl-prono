// Lissage des stats d'équipe avec la saison précédente, partagé par la NHL
// (nhlStats.ts) et la Ligue Magnus (magnusStats.ts).
import type { TeamStats } from "./nhlStats";

// Comme TeamStats, mais garde le nombre de matchs joués — nécessaire pour
// pondérer le lissage avec l'historique du club (voir blendSeasons).
export type RawTeamStats = TeamStats & { gamesPlayed: number };

// Un match unique en tout début de saison ne définit pas le profil réel
// d'un club (ex. Angers 1-4 puis modélisé à 1,5% de chances de gagner un
// match ultérieur) : ses stats de la saison en cours sont donc lissées avec
// celles de la dernière saison jouée, pondérées par le nombre de matchs
// déjà joués cette saison. Ce poids représente le nombre de matchs de la
// saison en cours à partir duquel l'historique cesse de peser la moitié de
// la moyenne — avant ça, l'historique du club domine ; après, c'est la
// saison en cours qui prend le dessus, jusqu'à ne presque plus compter.
const PRIOR_SEASON_WEIGHT_GAMES = 10;

function blendWithHistory(
  current: RawTeamStats | undefined,
  prior: RawTeamStats | undefined,
): TeamStats | undefined {
  if (!current) {
    if (!prior) return undefined;
    const { abbrev, goalsForPerGame, goalsAgainstPerGame } = prior;
    return { abbrev, goalsForPerGame, goalsAgainstPerGame };
  }
  if (!prior) {
    const { abbrev, goalsForPerGame, goalsAgainstPerGame } = current;
    return { abbrev, goalsForPerGame, goalsAgainstPerGame };
  }

  const totalWeight = current.gamesPlayed + PRIOR_SEASON_WEIGHT_GAMES;
  return {
    abbrev: current.abbrev,
    goalsForPerGame:
      (current.goalsForPerGame * current.gamesPlayed +
        prior.goalsForPerGame * PRIOR_SEASON_WEIGHT_GAMES) /
      totalWeight,
    goalsAgainstPerGame:
      (current.goalsAgainstPerGame * current.gamesPlayed +
        prior.goalsAgainstPerGame * PRIOR_SEASON_WEIGHT_GAMES) /
      totalWeight,
  };
}

// Combine la saison en cours (peut n'avoir que 0-1 match joué par club en
// tout début de saison) avec l'historique. Un club absent de la saison en
// cours (pas encore joué) retombe entièrement sur son historique plutôt que
// de disparaître de l'aperçu des points ; un club absent de l'historique
// (nouveau promu, nouvelle franchise) utilise sa seule saison en cours.
export function blendSeasons(
  current: Map<string, RawTeamStats>,
  prior: Map<string, RawTeamStats>,
): Map<string, TeamStats> {
  const abbrevs = new Set([...current.keys(), ...prior.keys()]);
  const stats = new Map<string, TeamStats>();
  for (const abbrev of abbrevs) {
    const blended = blendWithHistory(current.get(abbrev), prior.get(abbrev));
    if (blended) stats.set(abbrev, blended);
  }
  return stats;
}
