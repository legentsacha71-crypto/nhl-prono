// Contrairement à nhlTeams.ts, l'API Ligue Magnus (magnusApi.ts) ne fournit
// aucune couleur d'équipe — seulement id/nom/abréviation. Ces couleurs ont
// donc été extraites manuellement des vrais blasons des 12 clubs actuels
// (saison 2025-2026, abréviations confirmées via `get_classementsphase`),
// en récupérant leurs logos officiels (champ `logo` de cette même réponse,
// hébergés sur hockeynet.fr) et en échantillonnant leurs couleurs
// dominantes — pas des couleurs choisies au hasard.
// Pour Grenoble et Amiens, le rendu du blason seul ne reflète pas les
// couleurs réelles du club (le blason de Grenoble mêle bleu glace/orange
// flamme, mais le maillot officiel est rouge/bleu marine ; le logo actuel
// d'Amiens est un simple "G" rouge). Ces deux entrées ont donc été
// recoupées avec les couleurs officielles publiques du club (maillot photo
// pour Grenoble, historique rouge/noir/blanc des "Gothiques" pour Amiens)
// plutôt que le seul échantillonnage du blason.
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
    primaryColor: "#D6202C",
    secondaryColor: "#1E3F82",
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
    primaryColor: "#E00010",
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
  // La ligue a renommé l'abréviation officielle de Briançon en "DRB" pour
  // la saison 2026-2027 (même club, même code propriétaire API "93003S" —
  // voir MAGNUS_ABBREV_RENAMES plus bas). On garde "BRI" ci-dessus pour que
  // les matchs déjà joués la saison passée (encore servis sous ce code par
  // l'API) gardent un blason coloré, et on ajoute "DRB" pour la saison en
  // cours.
  {
    abbrev: "DRB",
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

// L'API Ligue Magnus renvoie parfois le nom du club tout en majuscules
// selon la saisie faite côté ligue (ex. "DIABLES ROUGES BRIANÇON",
// "BOXERS DE BORDEAUX") alors que d'autres clubs sont en casse normale
// ("Dragons de Rouen") — pas une histoire de club "connu" ou non, juste une
// incohérence de saisie côté source. Pour un club déjà répertorié dans
// MAGNUS_TEAMS, on préfère donc toujours notre nom local (casse propre et
// stable d'une saison à l'autre) ; pour un club qu'on ne connaît pas
// encore, on retombe sur le nom brut de l'API plutôt que la seule
// abréviation, pour ne jamais afficher moins d'info qu'avant.
export function getMagnusDisplayName(abbrev: string, apiName: string): string {
  const team = MAGNUS_TEAMS.find((t) => t.abbrev === abbrev);
  return team?.name ?? apiName;
}

// Renommages d'abréviation officielle constatés d'une saison à l'autre pour
// un même club (même code propriétaire côté API) : "BRI" (Briançon,
// 2025-2026) est devenu "DRB" en 2026-2027. Utilisé par
// magnusStats.getTeamStats() pour que les stats d'une saison de repli
// (voir son commentaire) restent trouvables sous l'abréviation *actuelle*
// du club, même si la saison de repli les avait classées sous l'ancienne.
export const MAGNUS_ABBREV_RENAMES: Record<string, string> = {
  BRI: "DRB",
};

// La ligue n'est pas toujours cohérente elle-même : certains matchs déjà
// désignés de la saison en cours renvoient encore "BRI" au lieu de "DRB"
// dans `get_rencontres` (constaté sur un match du 15 septembre 2026,
// pourtant bien saison 2026-2027), alors que le classement (get_
// classementsphase) et les rencontres plus récentes utilisent déjà "DRB".
// Toute donnée par-match (magnus.ts, magnusResults.ts) doit donc aussi
// passer par ce renommage, pas seulement les stats de saison de repli —
// sinon la recherche par abréviation (stats d'équipe, notation) échoue en
// silence pour ces matchs-là.
export function normalizeMagnusAbbrev(abbrev: string): string {
  return MAGNUS_ABBREV_RENAMES[abbrev] ?? abbrev;
}

// Les 12 clubs actuels, pour tout endroit où l'utilisateur choisit une
// équipe dans une liste (ex. FavoriteTeamPicker) : MAGNUS_TEAMS contient en
// plus l'entrée historique "BRI" (conservée pour les matchs passés, voir
// commentaire plus haut), qui afficherait sinon "Briançon" en double.
export const SELECTABLE_MAGNUS_TEAMS: MagnusTeamInfo[] = MAGNUS_TEAMS.filter(
  (t) => !(t.abbrev in MAGNUS_ABBREV_RENAMES),
);

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
