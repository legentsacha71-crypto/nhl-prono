// On importe seulement le *type* TeamStats depuis nhlStats.ts (même forme
// que scoring.ts attend déjà) : ça garantit que estimateWinPoints() marche
// à l'identique pour la Ligue Magnus, sans dupliquer le modèle Poisson ni
// créer de dépendance d'exécution vers le code NHL.
import type { TeamStats } from "./nhlStats";
import {
  findRegularSeasonPhase,
  getCurrentCompetitionId,
  getPhases,
} from "./magnusApi";

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

// Comme pour la NHL (/v1/standings/now), on ne calcule les stats d'équipe
// qu'à partir de la saison régulière — les séries finales ont trop peu de
// matchs par équipe pour être représentatives d'une force offensive/défensive.
export async function getTeamStats(): Promise<Map<string, TeamStats>> {
  const competitionId = await getCurrentCompetitionId();
  if (!competitionId) return new Map();

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

  const stats = new Map<string, TeamStats>();
  for (const position of data.positions) {
    if (position.nombre_rencontres_joues === 0) continue;
    stats.set(position.equipe.abreviation, {
      abbrev: position.equipe.abreviation,
      goalsForPerGame:
        position.nombre_but_marque / position.nombre_rencontres_joues,
      goalsAgainstPerGame:
        position.nombre_but_concede / position.nombre_rencontres_joues,
    });
  }
  return stats;
}

export function getLeagueAverageGoals(stats: Map<string, TeamStats>): number {
  const values = [...stats.values()];
  if (values.length === 0) return NaN;
  const total = values.reduce((sum, t) => sum + t.goalsForPerGame, 0);
  return total / values.length;
}
