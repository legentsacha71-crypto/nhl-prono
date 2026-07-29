// Contrairement à nhlTeams.ts, l'API Ligue Magnus (magnusApi.ts) ne fournit
// aucune couleur d'équipe — seulement id/nom/abréviation. Ces couleurs ont
// donc été extraites manuellement des vrais blasons des 12 clubs actuels
// (saison 2025-2026, abréviations confirmées via `get_classementsphase`),
// en récupérant leurs logos officiels (champ `logo` de cette même réponse,
// hébergés sur hockeynet.fr) et en échantillonnant leurs couleurs
// dominantes — pas des couleurs choisies au hasard.
// Exception : le logo renvoyé par l'API pour Amiens (abréviation "AMI") ne
// correspond pas au club (visuel générique sans rapport avec les
// "Gothiques"), ses couleurs viennent donc de l'identité connue du club
// (violet/noir) plutôt que d'un échantillonnage du blason.
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
    primaryColor: "#F2701C",
    secondaryColor: "#3E6E96",
  },
  {
    abbrev: "ANG",
    name: "Angers",
    primaryColor: "#14234E",
    secondaryColor: "#CC2030",
  },
  {
    abbrev: "BOR",
    name: "Bordeaux",
    primaryColor: "#C8202A",
    secondaryColor: "#141414",
  },
  {
    abbrev: "ROU",
    name: "Rouen",
    primaryColor: "#F2A900",
    secondaryColor: "#1A1A1A",
  },
  {
    abbrev: "AMI",
    name: "Amiens",
    primaryColor: "#5B2A86",
    secondaryColor: "#1A1A1A",
  },
  {
    abbrev: "MAR",
    name: "Marseille",
    primaryColor: "#29ABE2",
    secondaryColor: "#16305A",
  },
  {
    abbrev: "CHA",
    name: "Chamonix",
    primaryColor: "#A31E22",
    secondaryColor: "#1A1A1A",
  },
  {
    abbrev: "NIC",
    name: "Nice",
    primaryColor: "#D4AF37",
    secondaryColor: "#141B34",
  },
  {
    abbrev: "BRI",
    name: "Briançon",
    primaryColor: "#B3232F",
    secondaryColor: "#141414",
  },
  {
    abbrev: "CER",
    name: "Cergy-Pontoise",
    primaryColor: "#0E7A5C",
    secondaryColor: "#C8102E",
  },
  {
    abbrev: "HOR",
    name: "Anglet",
    primaryColor: "#3FA79A",
    secondaryColor: "#E3002B",
  },
  {
    abbrev: "GAP",
    name: "Gap",
    primaryColor: "#1CADE4",
    secondaryColor: "#141414",
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
