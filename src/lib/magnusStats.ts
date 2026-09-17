// On importe seulement le *type* TeamStats depuis nhlStats.ts (même forme
// que scoring.ts attend déjà) : ça garantit que estimateWinPoints() marche
// à l'identique pour la Ligue Magnus, sans dupliquer le modèle Poisson ni
// créer de dépendance d'exécution vers le code NHL.
import type { TeamStats } from "./nhlStats";
import {
  findRegularSeasonPhase,
  getCompetitionsBySeasonDesc,
  getPhases,
} from "./magnusApi";
import { MAGNUS_ABBREV_RENAMES } from "./magnusTeams";

const ADMIN_AJAX_URL = "https://liguemagnus.com/wp-admin/admin-ajax.php";

type MagnusStandingsPosition = {
  equipe: { abreviation: string };
  nombre_but_marque: number;
  nombre_but_concede: number;
  nombre_rencontres_joues: number;
};

type MagnusStandingsResponse = {
  positions: MagnusStandingsPosition[];
};

// Comme TeamStats, mais garde le nombre de matchs joués — nécessaire pour
// pondérer le lissage avec l'historique du club (voir getTeamStats).
type RawTeamStats = TeamStats & { gamesPlayed: number };

async function getClassementStats(
  competitionId: number,
): Promise<Map<string, RawTeamStats>> {
  const phases = await getPhases(competitionId);
  const regularSeason = findRegularSeasonPhase(phases);
  if (!regularSeason) return new Map();

  const res = await fetch(ADMIN_AJAX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      action: "get_classementsphase",
      phase_id: String(regularSeason.id),
    }),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`Erreur API Ligue Magnus (classement): ${res.status}`);
  }

  const json = await res.json();
  if (!json.success) {
    throw new Error("Erreur API Ligue Magnus (classement): réponse en échec");
  }
  const data: MagnusStandingsResponse = json.data.data;

  const stats = new Map<string, RawTeamStats>();
  for (const position of data.positions) {
    if (position.nombre_rencontres_joues === 0) continue;
    // Une saison de repli (voir getTeamStats ci-dessous) classe forcément
    // ses équipes sous les abréviations en vigueur *cette saison-là* — si
    // la ligue a depuis renommé un club (ex. Briançon "BRI" → "DRB" entre
    // 2025-26 et 2026-27, même club), on reclasse tout de suite sous
    // l'abréviation actuelle pour que la recherche par abréviation des
    // matchs en cours (getWinPointsPreview) retrouve bien ces stats.
    const abbrev =
      MAGNUS_ABBREV_RENAMES[position.equipe.abreviation] ??
      position.equipe.abreviation;
    stats.set(abbrev, {
      abbrev,
      goalsForPerGame:
        position.nombre_but_marque / position.nombre_rencontres_joues,
      goalsAgainstPerGame:
        position.nombre_but_concede / position.nombre_rencontres_joues,
      gamesPlayed: position.nombre_rencontres_joues,
    });
  }
  return stats;
}

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
// tout début de saison) avec la dernière saison qui a vraiment des matchs
// joués, servant d'historique — voir blendWithHistory. Un club absent de
// la saison en cours (pas encore joué) retombe entièrement sur son
// historique plutôt que de disparaître de l'aperçu des points ; un club
// absent de l'historique (nouveau promu) utilise sa seule saison en cours,
// comme avant.
export async function getTeamStats(): Promise<Map<string, TeamStats>> {
  const competitions = await getCompetitionsBySeasonDesc();
  if (competitions.length === 0) return new Map();

  const [current, ...previous] = competitions;
  const currentStats = await getClassementStats(current.id);

  let priorStats = new Map<string, RawTeamStats>();
  for (const competition of previous) {
    priorStats = await getClassementStats(competition.id);
    if (priorStats.size > 0) break;
  }

  const abbrevs = new Set([...currentStats.keys(), ...priorStats.keys()]);
  const stats = new Map<string, TeamStats>();
  for (const abbrev of abbrevs) {
    const blended = blendWithHistory(
      currentStats.get(abbrev),
      priorStats.get(abbrev),
    );
    if (blended) stats.set(abbrev, blended);
  }
  return stats;
}

export function getLeagueAverageGoals(stats: Map<string, TeamStats>): number {
  const values = [...stats.values()];
  if (values.length === 0) return NaN;
  const total = values.reduce((sum, t) => sum + t.goalsForPerGame, 0);
  return total / values.length;
}
