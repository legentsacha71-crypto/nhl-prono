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
import { blendSeasons, type RawTeamStats } from "./teamStatsBlend";

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

// Combine la saison en cours avec la dernière saison qui a vraiment des
// matchs joués, servant d'historique — voir blendSeasons (teamStatsBlend.ts).
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

  return blendSeasons(currentStats, priorStats);
}

export function getLeagueAverageGoals(stats: Map<string, TeamStats>): number {
  const values = [...stats.values()];
  if (values.length === 0) return NaN;
  const total = values.reduce((sum, t) => sum + t.goalsForPerGame, 0);
  return total / values.length;
}
