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

async function getClassementStats(
  competitionId: number,
): Promise<Map<string, TeamStats>> {
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
    });
  }
  return stats;
}

// Comme pour la NHL (/v1/standings/now, qui continue de renvoyer la saison
// précédente tant que la nouvelle n'a pas commencé), on veut un aperçu des
// points gagnables même avant le premier match de la saison en cours. Ici
// l'API Ligue Magnus expose déjà un calendrier pour la saison à venir dès
// l'été, mais son classement reste à 0 match joué pour tout le monde
// jusqu'au coup d'envoi — on retombe donc sur la dernière saison qui a
// vraiment des matchs joués, saison par saison en remontant dans le temps.
// Dès que la saison en cours a au moins un match joué quelque part, elle
// reprend la main automatiquement (plus besoin du fallback).
export async function getTeamStats(): Promise<Map<string, TeamStats>> {
  const competitions = await getCompetitionsBySeasonDesc();

  for (const competition of competitions) {
    const stats = await getClassementStats(competition.id);
    if (stats.size > 0) return stats;
  }
  return new Map();
}

export function getLeagueAverageGoals(stats: Map<string, TeamStats>): number {
  const values = [...stats.values()];
  if (values.length === 0) return NaN;
  const total = values.reduce((sum, t) => sum + t.goalsForPerGame, 0);
  return total / values.length;
}
