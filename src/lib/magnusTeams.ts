// Contrairement à nhlTeams.ts, l'API Ligue Magnus (magnusApi.ts) ne fournit
// aucune couleur d'équipe — seulement id/nom/abréviation. Cette liste est
// donc une estimation manuelle des couleurs de maillot des 12 clubs actuels
// (saison 2025-2026, abréviations confirmées via l'action `get_classementsphase`
// de l'API), au même usage que NHL_TEAMS : un badge/dégradé coloré plutôt
// qu'un gris neutre, sans reproduire de logo officiel.
export type MagnusTeamInfo = {
  abbrev: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
};

export const MAGNUS_TEAMS: MagnusTeamInfo[] = [
  {
    abbrev: "GRE",
    name: "Grenoble",
    primaryColor: "#E4032E",
    secondaryColor: "#1A1A1A",
  },
  {
    abbrev: "ANG",
    name: "Angers",
    primaryColor: "#F4C430",
    secondaryColor: "#111111",
  },
  {
    abbrev: "BOR",
    name: "Bordeaux",
    primaryColor: "#002F6C",
    secondaryColor: "#C8102E",
  },
  {
    abbrev: "ROU",
    name: "Rouen",
    primaryColor: "#8B1E3F",
    secondaryColor: "#F5A623",
  },
  {
    abbrev: "AMI",
    name: "Amiens",
    primaryColor: "#6A1B9A",
    secondaryColor: "#1A1A1A",
  },
  {
    abbrev: "MAR",
    name: "Marseille",
    primaryColor: "#0072CE",
    secondaryColor: "#FFFFFF",
  },
  {
    abbrev: "CHA",
    name: "Chamonix",
    primaryColor: "#D62839",
    secondaryColor: "#1B3A6B",
  },
  {
    abbrev: "NIC",
    name: "Nice",
    primaryColor: "#CE1126",
    secondaryColor: "#111111",
  },
  {
    abbrev: "BRI",
    name: "Briançon",
    primaryColor: "#B71234",
    secondaryColor: "#002654",
  },
  {
    abbrev: "CER",
    name: "Cergy-Pontoise",
    primaryColor: "#6C3483",
    secondaryColor: "#F39C12",
  },
  {
    abbrev: "HOR",
    name: "Anglet",
    primaryColor: "#009A44",
    secondaryColor: "#FFFFFF",
  },
  {
    abbrev: "GAP",
    name: "Gap",
    primaryColor: "#1E5AA8",
    secondaryColor: "#FDB813",
  },
];

export function getMagnusTeamName(abbrev: string): string {
  return MAGNUS_TEAMS.find((t) => t.abbrev === abbrev)?.name ?? abbrev;
}

export function getMagnusTeamColors(abbrev: string): {
  primary: string;
  secondary: string;
} {
  const team = MAGNUS_TEAMS.find((t) => t.abbrev === abbrev);
  return {
    primary: team?.primaryColor ?? "#404040",
    secondary: team?.secondaryColor ?? "#171717",
  };
}
