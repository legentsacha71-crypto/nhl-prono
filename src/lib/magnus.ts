import {
  getAllSeasonMatches,
  getCurrentCompetitionId,
  isMatchAssigned,
  type AssignedMagnusApiMatch,
  parisLocalToUTC,
} from "./magnusApi";
import {
  MAGNUS_SCHEDULE_2627,
  MAGNUS_SCHEDULE_2627_COMPETITION_ID,
  type StaticMagnusFixture,
} from "./magnusSchedule2627";
import {
  getMagnusDisplayName,
  getMagnusTeamName,
  normalizeMagnusAbbrev,
} from "./magnusTeams";
import { getFlashscoreMagnusGamesCached } from "./flashscore";

// Même forme que NhlGame (voir nhl.ts) pour rester compatible avec les
// composants existants (TeamBadge, PredictionForm, le regroupement par
// jour/mois...) sans dépendre du type NHL lui-même.
export type MagnusGame = {
  id: number;
  startTimeUTC: string;
  gameState: string; // "OFF" (terminé) | "LIVE" (en cours) | "FUT" (à venir)
  awayTeam: { abbrev: string; name: string; score?: number };
  homeTeam: { abbrev: string; name: string; score?: number };
  // Vrai quand ce match vient du calendrier statique (magnusSchedule2627.ts)
  // plutôt que de l'API officielle — la ligue n'a pas encore désigné cette
  // rencontre elle-même, donc la date/heure est une estimation. Absent
  // (= false) pour tout match sourcé depuis l'API. Ne pas brancher de
  // pronostic sur un match provisoire : son id est synthétique et ne
  // correspond à aucun match réel côté API (voir toStaticGame ci-dessous),
  // il deviendrait orphelin dès que l'API confirme la vraie rencontre.
  isProvisional?: boolean;
  // Vrai pour un match commencé que la ligue n'a pas passé "en cours" : son
  // score affiché par l'API reste un 0-0 de remplissage, à ne pas montrer.
  scoreUnavailable?: boolean;
};

// La ligue ne passe pas tous ses matchs "en cours" (etat "E") : le
// 2026-10-02, seul Nice–Rouen l'était sur les 6 matchs de la soirée, les
// autres restaient à null jusqu'à leur résultat. Un match dont le coup
// d'envoi est passé et qui n'est pas terminé est donc considéré en cours,
// dans la limite de cette durée (au-delà, la ligue a simplement oublié de
// le clore).
const ASSUMED_LIVE_MS = 5 * 60 * 60 * 1000;

// Voir le commentaire sur `etat` dans magnusApi.ts : "T" = terminé, "E" = en
// cours, tout le reste (généralement null) = pas encore commencé.
function toGameState(etat: string | null): string {
  if (etat === "T") return "OFF";
  if (etat === "E") return "LIVE";
  return "FUT";
}

function toGame(m: AssignedMagnusApiMatch): MagnusGame {
  const homeScoreEntry = m.score.find((s) => s.equipe_id === m.receveur.id);
  const awayScoreEntry = m.score.find((s) => s.equipe_id === m.visiteur.id);
  // Voir normalizeMagnusAbbrev : certains matchs déjà désignés de la
  // saison en cours renvoient encore l'ancienne abréviation d'un club
  // renommé, ce qui casserait la recherche de stats d'équipe (aperçu des
  // points gagnables) si on gardait la valeur brute de l'API ici.
  const homeAbbrev = normalizeMagnusAbbrev(m.receveur.abreviation);
  const awayAbbrev = normalizeMagnusAbbrev(m.visiteur.abreviation);

  const startTimeUTC = parisLocalToUTC(m.date_rencontre);
  let gameState = toGameState(m.etat);
  let scoreUnavailable = false;
  const sinceStart = Date.now() - new Date(startTimeUTC).getTime();
  if (gameState === "FUT" && sinceStart >= 0 && sinceStart < ASSUMED_LIVE_MS) {
    gameState = "LIVE";
    scoreUnavailable = true;
  } else if (gameState === "LIVE" && sinceStart >= ASSUMED_LIVE_MS) {
    // La ligue tarde aussi à clore les matchs : le 2026-10-04, Chamonix–Nice
    // y était encore "en cours" plus de 3 h 30 après le coup d'envoi. Au-delà
    // de cette durée, le match est forcément fini.
    gameState = "OFF";
  }

  return {
    id: m.id,
    startTimeUTC,
    gameState,
    scoreUnavailable,
    awayTeam: {
      abbrev: awayAbbrev,
      name: getMagnusDisplayName(
        awayAbbrev,
        m.visiteur.libelle_complet || m.visiteur.libelle_court,
      ),
      score: awayScoreEntry?.score,
    },
    homeTeam: {
      abbrev: homeAbbrev,
      name: getMagnusDisplayName(
        homeAbbrev,
        m.receveur.libelle_complet || m.receveur.libelle_court,
      ),
      score: homeScoreEntry?.score,
    },
  };
}

// Id synthétique stable (dérivé de la position dans le tableau statique,
// qui ne change jamais) pour les matchs de secours. Choisi très au-dessus
// de la plage des vrais id API (~77000-78000 aujourd'hui) pour ne jamais
// entrer en collision avec un id réel.
const STATIC_ID_OFFSET = 900_000;

// Beaucoup de rencontres du dimanche démarrent plus tôt (15h-18h35 selon
// les créneaux déjà confirmés par l'API) que les matchs de semaine (20h-
// 20h30 en général). Le PDF officiel n'indique aucune heure précise, donc
// on ne peut qu'estimer : 17h le dimanche, 20h sinon. L'API remplace cette
// estimation dès qu'elle confirme la vraie rencontre (voir mergeWithStatic
// ci-dessous), donc cet écart ne dure jamais plus que quelques semaines.
function toStaticGame(fixture: StaticMagnusFixture, index: number): MagnusGame {
  const isSunday = new Date(`${fixture.date}T12:00:00`).getDay() === 0;
  const kickoff = isSunday ? "17:00" : "20:00";

  return {
    id: STATIC_ID_OFFSET + index,
    startTimeUTC: parisLocalToUTC(`${fixture.date} ${kickoff}`),
    gameState: "FUT",
    isProvisional: true,
    awayTeam: {
      abbrev: fixture.away,
      name: getMagnusTeamName(fixture.away),
    },
    homeTeam: {
      abbrev: fixture.home,
      name: getMagnusTeamName(fixture.home),
    },
  };
}

// Complète les matchs déjà confirmés par l'API avec le calendrier statique
// (magnusSchedule2627.ts) pour les rencontres que la ligue n'a pas encore
// désignées elle-même — voir le commentaire en tête de ce fichier de
// données pour le détail. On exclut une entrée statique dès que l'API a
// déjà confirmé un match avec le même couple (recevant, visiteur) — et non
// simplement la même date : la plupart des journées ont plusieurs
// rencontres, et l'API n'en confirme souvent qu'une seule à l'avance, donc
// exclure toute la date masquerait à tort la majorité du calendrier
// statique. L'API reste toujours la source de vérité quand elle a confirmé
// un couple donné, y compris quand la ligue a réorganisé une rencontre
// depuis la publication du PDF (voir les 2 écarts connus documentés dans
// magnusSchedule2627.ts) : ce filtre par couple les résout automatiquement,
// sans correctif manuel dans les données statiques.
function mergeWithStatic(
  apiGames: MagnusGame[],
  assignedMatches: AssignedMagnusApiMatch[],
  competitionId: number,
): MagnusGame[] {
  if (competitionId !== MAGNUS_SCHEDULE_2627_COMPETITION_ID) return apiGames;

  // Voir normalizeMagnusAbbrev : sans ça, un match déjà confirmé sous
  // l'ancienne abréviation d'un club renommé (ex. "BRI") ne matcherait
  // jamais la paire "DRB|..." du calendrier statique, et l'entrée
  // provisoire correspondante ne serait pas exclue (doublon du même match).
  const assignedPairs = new Set(
    assignedMatches.map(
      (m) =>
        `${normalizeMagnusAbbrev(m.receveur.abreviation)}|${normalizeMagnusAbbrev(m.visiteur.abreviation)}`,
    ),
  );
  const staticGames = MAGNUS_SCHEDULE_2627.map((fixture, index) => ({
    fixture,
    index,
  }))
    .filter(
      ({ fixture }) => !assignedPairs.has(`${fixture.home}|${fixture.away}`),
    )
    .map(({ fixture, index }) => toStaticGame(fixture, index));

  return [...apiGames, ...staticGames];
}

// Un match que Flashscore donne terminé l'est aussi pour l'appli, avec son
// score final, même si la ligue ne l'a pas encore clos (elle peut tarder
// plus d'une heure). Sans réponse de Flashscore, rien ne change.
async function withFlashscoreResults(games: MagnusGame[]): Promise<MagnusGame[]> {
  const finished = (await getFlashscoreMagnusGamesCached().catch(() => [])).filter(
    (g) => g.state === "OFF" && g.home !== null && g.away !== null,
  );
  if (finished.length === 0) return games;
  return games.map((game) => {
    if (game.isProvisional || game.gameState === "OFF") return game;
    const start = new Date(game.startTimeUTC).getTime();
    const fs = finished.find(
      (g) =>
        g.homeAbbrev === game.homeTeam.abbrev &&
        g.awayAbbrev === game.awayTeam.abbrev &&
        Math.abs(g.startTimeMs - start) < 3 * 60 * 60 * 1000,
    );
    if (!fs) return game;
    return {
      ...game,
      gameState: "OFF",
      scoreUnavailable: false,
      homeTeam: { ...game.homeTeam, score: fs.home ?? undefined },
      awayTeam: { ...game.awayTeam, score: fs.away ?? undefined },
    };
  });
}

export async function getUpcomingGames(): Promise<MagnusGame[]> {
  const competitionId = await getCurrentCompetitionId();
  if (!competitionId) return [];

  const matches = await getAllSeasonMatches(competitionId, 60);
  const assigned = matches.filter(isMatchAssigned);
  const now = Date.now();

  // Un match "en cours" (LIVE) reste affiché quelle que soit l'heure locale
  // (sa durée réelle est imprévisible) ; seul "terminé" (OFF) en sort. Un
  // match pas encore commencé continue de suivre l'heure de coup d'envoi.
  const games = await withFlashscoreResults(assigned.map(toGame));
  return mergeWithStatic(games, assigned, competitionId)
    .filter(
      (g) =>
        g.gameState !== "OFF" &&
        (g.gameState === "LIVE" || new Date(g.startTimeUTC).getTime() > now),
    )
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

  // Exclut les rencontres dont la ligue n'a pas encore désigné les deux
  // équipes ("Non assigné / Non assigné", fréquent pour les derniers mois
  // d'une saison à venir) : les afficher produirait des cartes de match
  // avec des équipes vides plutôt que de simplement les masquer. Le
  // calendrier statique (mergeWithStatic) comble ce trou pour la saison
  // 2026-2027 en attendant que l'API confirme ces rencontres elle-même.
  const assigned = matches.filter(isMatchAssigned);

  const games = await withFlashscoreResults(assigned.map(toGame));
  return mergeWithStatic(games, assigned, competitionId).sort(
    (a, b) =>
      new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime(),
  );
}
