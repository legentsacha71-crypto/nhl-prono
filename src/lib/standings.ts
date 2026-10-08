import { nhlFetch } from "./nhlFetch";
import {
  findRegularSeasonPhase,
  getCurrentCompetitionId,
  getPhases,
} from "./magnusApi";
import { getMagnusTeamName, normalizeMagnusAbbrev } from "./magnusTeams";

// Classements affichés dans l'onglet "Classement" de la page Matchs, sur le
// modèle de Flashscore. Les deux ligues sont relues toutes les minutes : un
// match terminé y apparaît dès que la ligue l'a validé.

// Zone du classement à ce jour : qualifié pour les séries, ou poule de
// maintien (Ligue Magnus, 9e à 12e).
export type StandingZone = "playoffs" | "playdown";

export type StandingRow = {
  rank: number;
  zone?: StandingZone;
  abbrev: string;
  name: string;
  shortName: string; // "Rangers", "Chamonix"… pour la colonne équipe
  gamesPlayed: number;
  wins: number; // victoires dans le temps réglementaire
  otWins: number; // victoires en prolongation / tirs au but
  otLosses: number; // défaites en prolongation / tirs au but
  losses: number; // défaites dans le temps réglementaire
  points: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type StandingsTable = { title: string; rows: StandingRow[] };
// Bloc de tableaux sous un même intitulé ("Conférence", "Division").
export type StandingsBlock = { heading?: string; tables: StandingsTable[] };

export type StandingsSplit = "global" | "home" | "road";
export type NhlStandings = Record<StandingsSplit, StandingsBlock[]>;

type NhlStandingsTeam = {
  teamAbbrev: { default: string };
  teamName: { default: string };
  teamCommonName: { default: string };
  conferenceName: string;
  divisionName: string;
  divisionSequence: number;
  wildcardSequence: number; // 0 pour les 3 premiers de division
  conferenceSequence: number;
  conferenceHomeSequence: number;
  conferenceRoadSequence: number;
  divisionHomeSequence: number;
  divisionRoadSequence: number;
  gamesPlayed: number;
  wins: number;
  regulationWins: number;
  otLosses: number;
  losses: number;
  points: number;
  goalFor: number;
  goalAgainst: number;
  homeGamesPlayed: number;
  homeWins: number;
  homeRegulationWins: number;
  homeOtLosses: number;
  homeLosses: number;
  homePoints: number;
  homeGoalsFor: number;
  homeGoalsAgainst: number;
  roadGamesPlayed: number;
  roadWins: number;
  roadRegulationWins: number;
  roadOtLosses: number;
  roadLosses: number;
  roadPoints: number;
  roadGoalsFor: number;
  roadGoalsAgainst: number;
};

// Même ordre que Flashscore : Ouest puis Est.
const NHL_CONFERENCES: { name: string; title: string; divisions: string[] }[] = [
  { name: "Western", title: "Conférence de l'Ouest", divisions: ["Central", "Pacific"] },
  { name: "Eastern", title: "Conférence de l'Est", divisions: ["Atlantic", "Metropolitan"] },
];

const NHL_DIVISIONS: Record<string, string> = {
  Atlantic: "Division Atlantique",
  Metropolitan: "Division Métropolitaine",
  Central: "Division Centrale",
  Pacific: "Division Pacifique",
};

// Qualifiés à ce jour : les 3 premiers de chaque division, puis les 2
// meilleurs des autres équipes de la conférence (wild cards).
function isQualified(t: NhlStandingsTeam): boolean {
  return t.divisionSequence <= 3 || (t.wildcardSequence >= 1 && t.wildcardSequence <= 2);
}

function splitStats(t: NhlStandingsTeam, split: StandingsSplit) {
  if (split === "home") {
    return {
      conferenceRank: t.conferenceHomeSequence,
      divisionRank: t.divisionHomeSequence,
      gamesPlayed: t.homeGamesPlayed,
      wins: t.homeRegulationWins,
      otWins: t.homeWins - t.homeRegulationWins,
      otLosses: t.homeOtLosses,
      losses: t.homeLosses,
      points: t.homePoints,
      goalsFor: t.homeGoalsFor,
      goalsAgainst: t.homeGoalsAgainst,
    };
  }
  if (split === "road") {
    return {
      conferenceRank: t.conferenceRoadSequence,
      divisionRank: t.divisionRoadSequence,
      gamesPlayed: t.roadGamesPlayed,
      wins: t.roadRegulationWins,
      otWins: t.roadWins - t.roadRegulationWins,
      otLosses: t.roadOtLosses,
      losses: t.roadLosses,
      points: t.roadPoints,
      goalsFor: t.roadGoalsFor,
      goalsAgainst: t.roadGoalsAgainst,
    };
  }
  return {
    conferenceRank: t.conferenceSequence,
    divisionRank: t.divisionSequence,
    gamesPlayed: t.gamesPlayed,
    wins: t.regulationWins,
    otWins: t.wins - t.regulationWins,
    otLosses: t.otLosses,
    losses: t.losses,
    points: t.points,
    goalsFor: t.goalFor,
    goalsAgainst: t.goalAgainst,
  };
}

function nhlTable(
  title: string,
  teams: NhlStandingsTeam[],
  split: StandingsSplit,
  rankOf: "conferenceRank" | "divisionRank",
): StandingsTable {
  const rows = teams
    .map((t) => {
      const { conferenceRank, divisionRank, ...stats } = splitStats(t, split);
      return {
        rank: rankOf === "conferenceRank" ? conferenceRank : divisionRank,
        // La couleur de qualification n'a de sens que sur le classement global.
        zone: split === "global" && isQualified(t) ? ("playoffs" as const) : undefined,
        abbrev: t.teamAbbrev.default,
        name: t.teamName.default,
        shortName: t.teamCommonName.default,
        ...stats,
      };
    })
    .sort((a, b) => a.rank - b.rank);
  return { title, rows };
}

export async function getNhlStandings(): Promise<NhlStandings> {
  const res = await nhlFetch("standings/now", { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Erreur API NHL (standings): ${res.status}`);
  const { standings }: { standings: NhlStandingsTeam[] } = await res.json();

  const build = (split: StandingsSplit): StandingsBlock[] => [
    {
      heading: "Conférence",
      tables: NHL_CONFERENCES.map(({ name, title }) =>
        nhlTable(
          title,
          standings.filter((t) => t.conferenceName === name),
          split,
          "conferenceRank",
        ),
      ).filter((table) => table.rows.length > 0),
    },
    {
      heading: "Division",
      tables: NHL_CONFERENCES.flatMap((c) => c.divisions)
        .map((division) =>
          nhlTable(
            NHL_DIVISIONS[division] ?? division,
            standings.filter((t) => t.divisionName === division),
            split,
            "divisionRank",
          ),
        )
        .filter((table) => table.rows.length > 0),
    },
  ];

  return { global: build("global"), home: build("home"), road: build("road") };
}

const MAGNUS_AJAX_URL = "https://liguemagnus.com/wp-admin/admin-ajax.php";

type MagnusPosition = {
  position: number;
  equipe: { abreviation: string };
  nombre_point: number;
  nombre_rencontres_joues: number;
  nombre_victoire: number;
  nombre_vprl: number;
  nombre_dprl: number;
  nombre_defaite: number;
  nombre_but_marque: number;
  nombre_but_concede: number;
};

// Classement de la saison régulière, tel que publié par la ligue (3 pts la
// victoire, 2 en prolongation / tirs au but, 1 pour la défaite après 60 min).
// Formule 2026-2027 : les 8 premiers vont en playoffs, les 9e à 12e en
// poule de maintien.
const MAGNUS_PLAYOFF_SPOTS = 8;

export async function getMagnusStandings(): Promise<StandingsBlock[]> {
  const competitionId = await getCurrentCompetitionId();
  if (!competitionId) return [];
  const regularSeason = findRegularSeasonPhase(await getPhases(competitionId));
  if (!regularSeason) return [];

  const res = await fetch(MAGNUS_AJAX_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      action: "get_classementsphase",
      phase_id: String(regularSeason.id),
    }),
    next: { revalidate: 60 },
  });
  if (!res.ok) throw new Error(`Erreur API Ligue Magnus (classement): ${res.status}`);
  const json = await res.json();
  if (!json.success) throw new Error("Erreur API Ligue Magnus (classement): réponse en échec");
  const positions: MagnusPosition[] = json.data.data.positions;

  const rows = [...positions]
    .sort((a, b) => a.position - b.position)
    .map((p): StandingRow => {
      const abbrev = normalizeMagnusAbbrev(p.equipe.abreviation);
      return {
        rank: p.position,
        zone: p.position <= MAGNUS_PLAYOFF_SPOTS ? "playoffs" : "playdown",
        abbrev,
        name: getMagnusTeamName(abbrev),
        shortName: getMagnusTeamName(abbrev),
        gamesPlayed: p.nombre_rencontres_joues,
        wins: p.nombre_victoire,
        otWins: p.nombre_vprl,
        otLosses: p.nombre_dprl,
        losses: p.nombre_defaite,
        points: p.nombre_point,
        goalsFor: p.nombre_but_marque,
        goalsAgainst: p.nombre_but_concede,
      };
    });
  return [{ tables: [{ title: "Saison régulière", rows }] }];
}
