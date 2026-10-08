import { nhlFetch } from "./nhlFetch";
import { findRegularSeasonPhase, getCurrentCompetitionId, getPhases } from "./magnusApi";
import { getMagnusTeamName, normalizeMagnusAbbrev } from "./magnusTeams";

// Classements affichés dans l'onglet "Classement" de la page Matchs. Les deux
// ligues sont relues toutes les minutes : un match terminé y apparaît dès
// que la ligue l'a validé.
export type StandingRow = {
  rank: number;
  abbrev: string;
  name: string;
  shortName: string; // "Rangers", "Chamonix"… pour la colonne équipe
  gamesPlayed: number;
  wins: number; // victoires dans le temps réglementaire (Magnus) ou toutes (NHL)
  otWins?: number; // Magnus seulement : victoires en prolongation / tirs au but
  otLosses: number;
  losses: number;
  points: number;
  goalDiff: number;
};

export type StandingsGroup = { title: string; rows: StandingRow[] };

type NhlStandingsTeam = {
  teamAbbrev: { default: string };
  teamName: { default: string };
  teamCommonName: { default: string };
  conferenceName: string;
  conferenceSequence: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  otLosses: number;
  points: number;
  goalDifferential: number;
};

const NHL_CONFERENCES: { name: string; title: string }[] = [
  { name: "Eastern", title: "Conférence de l'Est" },
  { name: "Western", title: "Conférence de l'Ouest" },
];

export async function getNhlStandings(): Promise<StandingsGroup[]> {
  const res = await nhlFetch("standings/now", { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`Erreur API NHL (standings): ${res.status}`);
  const data: { standings: NhlStandingsTeam[] } = await res.json();

  return NHL_CONFERENCES.map(({ name, title }) => ({
    title,
    rows: data.standings
      .filter((t) => t.conferenceName === name)
      .sort((a, b) => a.conferenceSequence - b.conferenceSequence)
      .map((t) => ({
        rank: t.conferenceSequence,
        abbrev: t.teamAbbrev.default,
        name: t.teamName.default,
        shortName: t.teamCommonName.default,
        gamesPlayed: t.gamesPlayed,
        wins: t.wins,
        otLosses: t.otLosses,
        losses: t.losses,
        points: t.points,
        goalDiff: t.goalDifferential,
      })),
  })).filter((group) => group.rows.length > 0);
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
export async function getMagnusStandings(): Promise<StandingsGroup[]> {
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

  return [
    {
      title: "Saison régulière",
      rows: [...positions]
        .sort((a, b) => a.position - b.position)
        .map((p) => {
          const abbrev = normalizeMagnusAbbrev(p.equipe.abreviation);
          return {
            rank: p.position,
            abbrev,
            name: getMagnusTeamName(abbrev),
            shortName: getMagnusTeamName(abbrev),
            gamesPlayed: p.nombre_rencontres_joues,
            wins: p.nombre_victoire,
            otWins: p.nombre_vprl,
            otLosses: p.nombre_dprl,
            losses: p.nombre_defaite,
            points: p.nombre_point,
            goalDiff: p.nombre_but_marque - p.nombre_but_concede,
          };
        }),
    },
  ];
}
