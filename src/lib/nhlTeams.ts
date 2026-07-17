export type NhlTeamInfo = {
  abbrev: string;
  name: string;
  // Couleurs du maillot de l'équipe — utilisées pour un badge coloré à la
  // place du logo officiel (voir TeamBadge.tsx), afin d'éviter toute
  // reproduction de la propriété intellectuelle de la LNH.
  primaryColor: string;
  secondaryColor: string;
};

export const NHL_TEAMS: NhlTeamInfo[] = [
  { abbrev: "ANA", name: "Anaheim Ducks", primaryColor: "#F47A38", secondaryColor: "#111111" },
  { abbrev: "BOS", name: "Boston Bruins", primaryColor: "#111111", secondaryColor: "#FFB81C" },
  { abbrev: "BUF", name: "Buffalo Sabres", primaryColor: "#002654", secondaryColor: "#FCB514" },
  { abbrev: "CGY", name: "Calgary Flames", primaryColor: "#D2001C", secondaryColor: "#FAAF19" },
  { abbrev: "CAR", name: "Carolina Hurricanes", primaryColor: "#CC0000", secondaryColor: "#000000" },
  { abbrev: "CHI", name: "Chicago Blackhawks", primaryColor: "#CF0A2C", secondaryColor: "#000000" },
  { abbrev: "COL", name: "Colorado Avalanche", primaryColor: "#6F263D", secondaryColor: "#236192" },
  { abbrev: "CBJ", name: "Columbus Blue Jackets", primaryColor: "#002654", secondaryColor: "#CE1126" },
  { abbrev: "DAL", name: "Dallas Stars", primaryColor: "#006847", secondaryColor: "#111111" },
  { abbrev: "DET", name: "Detroit Red Wings", primaryColor: "#CE1126", secondaryColor: "#A2AAAD" },
  { abbrev: "EDM", name: "Edmonton Oilers", primaryColor: "#FF4C00", secondaryColor: "#041E42" },
  { abbrev: "FLA", name: "Florida Panthers", primaryColor: "#C8102E", secondaryColor: "#041E42" },
  { abbrev: "LAK", name: "Los Angeles Kings", primaryColor: "#111111", secondaryColor: "#A2AAAD" },
  { abbrev: "MIN", name: "Minnesota Wild", primaryColor: "#154734", secondaryColor: "#EAAA00" },
  { abbrev: "MTL", name: "Montréal Canadiens", primaryColor: "#AF1E2D", secondaryColor: "#001E62" },
  { abbrev: "NSH", name: "Nashville Predators", primaryColor: "#FFB81C", secondaryColor: "#041E42" },
  { abbrev: "NJD", name: "New Jersey Devils", primaryColor: "#CE1126", secondaryColor: "#000000" },
  { abbrev: "NYI", name: "New York Islanders", primaryColor: "#00539B", secondaryColor: "#F47D30" },
  { abbrev: "NYR", name: "New York Rangers", primaryColor: "#0038A8", secondaryColor: "#CE1126" },
  { abbrev: "OTT", name: "Ottawa Senators", primaryColor: "#C52032", secondaryColor: "#000000" },
  { abbrev: "PHI", name: "Philadelphia Flyers", primaryColor: "#F74902", secondaryColor: "#000000" },
  { abbrev: "PIT", name: "Pittsburgh Penguins", primaryColor: "#FCB514", secondaryColor: "#000000" },
  { abbrev: "SJS", name: "San Jose Sharks", primaryColor: "#006D75", secondaryColor: "#000000" },
  { abbrev: "SEA", name: "Seattle Kraken", primaryColor: "#001628", secondaryColor: "#99D9D9" },
  { abbrev: "STL", name: "St. Louis Blues", primaryColor: "#002F87", secondaryColor: "#FCB514" },
  { abbrev: "TBL", name: "Tampa Bay Lightning", primaryColor: "#002868", secondaryColor: "#000000" },
  { abbrev: "TOR", name: "Toronto Maple Leafs", primaryColor: "#00205B", secondaryColor: "#A2AAAD" },
  { abbrev: "UTA", name: "Utah Mammoth", primaryColor: "#69B3E7", secondaryColor: "#000000" },
  { abbrev: "VAN", name: "Vancouver Canucks", primaryColor: "#00205B", secondaryColor: "#00843D" },
  { abbrev: "VGK", name: "Vegas Golden Knights", primaryColor: "#B4975A", secondaryColor: "#333F42" },
  { abbrev: "WSH", name: "Washington Capitals", primaryColor: "#C8102E", secondaryColor: "#041E42" },
  { abbrev: "WPG", name: "Winnipeg Jets", primaryColor: "#041E42", secondaryColor: "#004C97" },
];

// Fuseau horaire de l'aréna de l'équipe à domicile, pour afficher l'heure
// locale du match à côté de l'heure française sur la page des pronostics.
export const TEAM_TIMEZONES: Record<string, string> = {
  ANA: "America/Los_Angeles",
  BOS: "America/New_York",
  BUF: "America/New_York",
  CGY: "America/Edmonton",
  CAR: "America/New_York",
  CHI: "America/Chicago",
  COL: "America/Denver",
  CBJ: "America/New_York",
  DAL: "America/Chicago",
  DET: "America/Detroit",
  EDM: "America/Edmonton",
  FLA: "America/New_York",
  LAK: "America/Los_Angeles",
  MIN: "America/Chicago",
  MTL: "America/Toronto",
  NSH: "America/Chicago",
  NJD: "America/New_York",
  NYI: "America/New_York",
  NYR: "America/New_York",
  OTT: "America/Toronto",
  PHI: "America/New_York",
  PIT: "America/New_York",
  SJS: "America/Los_Angeles",
  SEA: "America/Los_Angeles",
  STL: "America/Chicago",
  TBL: "America/New_York",
  TOR: "America/Toronto",
  UTA: "America/Denver",
  VAN: "America/Vancouver",
  VGK: "America/Los_Angeles",
  WSH: "America/New_York",
  WPG: "America/Winnipeg",
};

export function getTeamName(abbrev: string): string {
  return NHL_TEAMS.find((t) => t.abbrev === abbrev)?.name ?? abbrev;
}

export function getTeamColors(abbrev: string): { primary: string; secondary: string } {
  const team = NHL_TEAMS.find((t) => t.abbrev === abbrev);
  return {
    primary: team?.primaryColor ?? "#404040",
    secondary: team?.secondaryColor ?? "#171717",
  };
}

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function getAbbrevByName(name: string): string | null {
  const normalized = normalize(name);
  return (
    NHL_TEAMS.find((t) => normalize(t.name) === normalized)?.abbrev ?? null
  );
}
