import { nhlFetch } from "./nhlFetch";
import {
  getAllSeasonMatches,
  getCurrentCompetitionId,
  isMatchAssigned,
  parisLocalToUTC,
  regulationScore,
  type MagnusApiMatch,
} from "./magnusApi";
import { normalizeMagnusAbbrev } from "./magnusTeams";

// Forme récente des équipes (pastilles sous les logos dans "À venir"). Comme
// les pronostics, le résultat se lit après 60 minutes : un match parti en
// prolongation ou aux tirs au but compte comme une égalité.
export type FormResult = "W" | "L" | "D";

export type FormGame = {
  result: FormResult;
  opponent: string;
  home: boolean;
  teamScore: number; // score final, prolongation / tirs au but compris
  opponentScore: number;
  decidedIn: "REG" | "OT" | "SO";
  startTimeUTC: string;
};

// Par abréviation d'équipe, du plus ancien au plus récent.
export type TeamFormMap = Map<string, FormGame[]>;

export const FORM_LENGTH = 5;
// Matchs gardés par équipe : assez pour retrouver les 5 derniers à domicile
// ou à l'extérieur (filtres du classement). L'affichage n'en montre que 5.
const FORM_HISTORY = 15;

function addGame(
  form: TeamFormMap,
  team: string,
  game: FormGame,
) {
  const list = form.get(team) ?? [];
  list.push(game);
  form.set(team, list);
}

function regulationResult(team: number, opponent: number): FormResult {
  return team > opponent ? "W" : team < opponent ? "L" : "D";
}

function keepLast(form: TeamFormMap): TeamFormMap {
  for (const [team, games] of form) {
    games.sort(
      (a, b) =>
        new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime(),
    );
    form.set(team, games.slice(-FORM_HISTORY));
  }
  return form;
}

type NhlScheduleGame = {
  id: number;
  gameType: number; // 1 pré-saison, 2 saison régulière, 3 séries
  gameState: string;
  startTimeUTC: string;
  awayTeam: { abbrev: string; score?: number };
  homeTeam: { abbrev: string; score?: number };
  gameOutcome?: { lastPeriodType?: string };
};

// L'API NHL donne le calendrier par semaine : la semaine en cours et les 4
// précédentes suffisent pour avoir les 5 derniers matchs de chaque équipe
// (3 à 4 matchs par semaine), sauf en tout début de saison où il y en a
// simplement moins.
const NHL_WEEKS_BACK = 4;

export async function getNhlTeamForm(): Promise<TeamFormMap> {
  const today = new Date();
  const weekStarts = Array.from({ length: NHL_WEEKS_BACK + 1 }, (_, k) => {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - 7 * k);
    return d.toISOString().slice(0, 10);
  });

  const weeks = await Promise.all(
    weekStarts.map(async (date, k) => {
      const res = await nhlFetch(`schedule/${date}`, {
        next: { revalidate: k <= 1 ? 300 : 3600 },
      });
      if (!res.ok) return [];
      const data: { gameWeek: { games: NhlScheduleGame[] }[] } = await res.json();
      return data.gameWeek.flatMap((day) => day.games);
    }),
  );

  const seen = new Set<number>();
  const form: TeamFormMap = new Map();
  for (const g of weeks.flat()) {
    if (seen.has(g.id)) continue;
    seen.add(g.id);
    addNhlGame(form, g);
  }
  return keepLast(form);
}

// Un match NHL terminé de saison régulière ou de séries, ajouté aux deux
// équipes. Les autres (pré-saison, à venir, en cours) sont ignorés.
function addNhlGame(form: TeamFormMap, g: NhlScheduleGame) {
  if (g.gameType !== 2 && g.gameType !== 3) return;
  if (g.gameState !== "OFF" && g.gameState !== "FINAL") return;
  const home = g.homeTeam.score;
  const away = g.awayTeam.score;
  if (home === undefined || away === undefined) return;

  const period = g.gameOutcome?.lastPeriodType;
  const decidedIn = period === "OT" ? "OT" : period === "SO" ? "SO" : "REG";
  const draw = decidedIn !== "REG";
  addGame(form, g.homeTeam.abbrev, {
    result: draw ? "D" : regulationResult(home, away),
    opponent: g.awayTeam.abbrev,
    home: true,
    teamScore: home,
    opponentScore: away,
    decidedIn,
    startTimeUTC: g.startTimeUTC,
  });
  addGame(form, g.awayTeam.abbrev, {
    result: draw ? "D" : regulationResult(away, home),
    opponent: g.homeTeam.abbrev,
    home: false,
    teamScore: away,
    opponentScore: home,
    decidedIn,
    startTimeUTC: g.startTimeUTC,
  });
}

// Un match Ligue Magnus validé par la ligue (etat "T"), ajouté aux deux
// équipes.
function addMagnusMatch(form: TeamFormMap, m: MagnusApiMatch) {
  if (!isMatchAssigned(m) || m.etat !== "T") return;
  const homeAbbrev = normalizeMagnusAbbrev(m.receveur.abreviation);
  const awayAbbrev = normalizeMagnusAbbrev(m.visiteur.abreviation);
  const home = m.score.find((s) => s.equipe_id === m.receveur.id)?.score;
  const away = m.score.find((s) => s.equipe_id === m.visiteur.id)?.score;
  if (home === undefined || away === undefined) return;

  const regulation = regulationScore(m);
  const decidedIn =
    m.victoire_par === "PRL" ? "OT" : m.victoire_par === "TAB" ? "SO" : "REG";
  const startTimeUTC = parisLocalToUTC(m.date_rencontre);
  addGame(form, homeAbbrev, {
    result: regulationResult(regulation.homeScore, regulation.awayScore),
    opponent: awayAbbrev,
    home: true,
    teamScore: home,
    opponentScore: away,
    decidedIn,
    startTimeUTC,
  });
  addGame(form, awayAbbrev, {
    result: regulationResult(regulation.awayScore, regulation.homeScore),
    opponent: homeAbbrev,
    home: false,
    teamScore: away,
    opponentScore: home,
    decidedIn,
    startTimeUTC,
  });
}

// Matchs validés par la ligue de la saison en cours. Même requête (et même
// cache) que getUpcomingGames dans magnus.ts.
async function getMagnusSeasonMatches(): Promise<MagnusApiMatch[]> {
  const competitionId = await getCurrentCompetitionId();
  if (!competitionId) return [];
  return getAllSeasonMatches(competitionId, 60);
}

export async function getMagnusTeamForm(): Promise<TeamFormMap> {
  const form: TeamFormMap = new Map();
  for (const m of await getMagnusSeasonMatches()) addMagnusMatch(form, m);
  return keepLast(form);
}

// Tous les matchs joués cette saison par une équipe (page d'équipe), du plus
// ancien au plus récent.
export async function getTeamResults(
  league: "nhl" | "magnus",
  abbrev: string,
): Promise<FormGame[]> {
  const form: TeamFormMap = new Map();
  if (league === "nhl") {
    const res = await nhlFetch(`club-schedule-season/${abbrev}/now`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) throw new Error(`Erreur API NHL: ${res.status}`);
    const data: { games: NhlScheduleGame[] } = await res.json();
    for (const g of data.games) addNhlGame(form, g);
  } else {
    for (const m of await getMagnusSeasonMatches()) addMagnusMatch(form, m);
  }
  return (form.get(abbrev) ?? []).sort(
    (a, b) =>
      new Date(a.startTimeUTC).getTime() - new Date(b.startTimeUTC).getTime(),
  );
}
