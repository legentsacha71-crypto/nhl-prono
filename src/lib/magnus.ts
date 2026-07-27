import {
  getAllSeasonMatches,
  getCurrentCompetitionId,
  type MagnusApiMatch,
  parisLocalToUTC,
} from "./magnusApi";

// Même forme que NhlGame (voir nhl.ts) pour rester compatible avec les
// composants existants (TeamBadge, PredictionForm, le regroupement par
// jour/mois...) sans dépendre du type NHL lui-même.
export type MagnusGame = {
  id: number;
  startTimeUTC: string;
  gameState: string; // "OFF" (terminé) | "FUT" (à venir)
  awayTeam: { abbrev: string; name: string; score?: number };
  homeTeam: { abbrev: string; name: string; score?: number };
};

function toGame(m: MagnusApiMatch): MagnusGame {
  const homeScoreEntry = m.score.find((s) => s.equipe_id === m.receveur.id);
  const awayScoreEntry = m.score.find((s) => s.equipe_id === m.visiteur.id);

  return {
    id: m.id,
    startTimeUTC: parisLocalToUTC(m.date_rencontre),
    gameState: m.etat === "T" ? "OFF" : "FUT",
    awayTeam: {
      abbrev: m.visiteur.abreviation,
      name: m.visiteur.libelle_complet || m.visiteur.libelle_court,
      score: awayScoreEntry?.score,
    },
    homeTeam: {
      abbrev: m.receveur.abreviation,
      name: m.receveur.libelle_complet || m.receveur.libelle_court,
      score: homeScoreEntry?.score,
    },
  };
}

export async function getUpcomingGames(): Promise<MagnusGame[]> {
  const competitionId = await getCurrentCompetitionId();
  if (!competitionId) return [];

  const matches = await getAllSeasonMatches(competitionId, 60);
  const now = Date.now();

  return matches
    .map(toGame)
    .filter((g) => new Date(g.startTimeUTC).getTime() > now)
    .sort(
      (a, b) =>
        new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime(),
    );
}

// Saison régulière + séries finales confondues, pour l'onglet "Calendrier"
// (contrairement à getSeasonSchedule côté NHL, qui exclut les séries
// éliminatoires faute de dates de début/fin exploitables côté API NHL pour
// cette période).
export async function getSeasonSchedule(): Promise<MagnusGame[]> {
  const competitionId = await getCurrentCompetitionId();
  if (!competitionId) return [];

  const matches = await getAllSeasonMatches(competitionId, 3600);

  return matches
    .map(toGame)
    .sort(
      (a, b) =>
        new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime(),
    );
}
