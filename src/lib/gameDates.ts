// Dates et états des matchs, à l'heure de Paris : partagés par l'onglet
// Matchs (src/app/matches/page.tsx) et le calendrier de saison
// (src/lib/calendarMonths.ts, servi par /api/calendar/[league]).

// Forme commune à NhlGame (src/lib/nhl.ts) et MagnusGame (src/lib/magnus.ts)
// — les deux types sont structurellement identiques par conception, donc les
// fonctions de regroupement ci-dessous s'appliquent aux deux compétitions
// sans dupliquer cette logique par ligue.
export type Game = {
  id: number;
  startTimeUTC: string;
  gameState: string;
  awayTeam: { abbrev: string; name: string; score?: number };
  homeTeam: { abbrev: string; name: string; score?: number };
  // Présent uniquement côté Magnus : vrai quand la rencontre vient du
  // calendrier statique de secours plutôt que d'être confirmée par l'API de
  // la ligue (voir src/lib/magnus.ts). La date/heure est alors une
  // estimation.
  isProvisional?: boolean;
};

// Construire un Intl.DateTimeFormat coûte bien plus cher que de s'en servir :
// toLocaleTimeString() en recrée un à chaque appel, soit plus de 1 600 par
// visite de la page (un par match du calendrier). On les crée une seule fois.
const DAY_LABEL_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "2-digit",
  month: "short",
  timeZone: "Europe/Paris",
});
const TIME_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Paris",
});
const MONTH_LABEL_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});
// Date AAAA-MM-JJ à Paris, pour regrouper par jour et par mois. Le serveur
// tourne en UTC : sans ça, un match NHL à 1h30 heure de Paris (23h30 UTC la
// veille) atterrissait dans la journée précédente.
const PARIS_DATE_KEY_FORMAT = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Paris",
});

export function parisDateKey(iso: string) {
  return PARIS_DATE_KEY_FORMAT.format(new Date(iso));
}

export function formatDayLabel(iso: string) {
  return DAY_LABEL_FORMAT.format(new Date(iso));
}

export function formatTime(iso: string) {
  return TIME_FORMAT.format(new Date(iso));
}

export function formatMonthLabel(iso: string) {
  const label = MONTH_LABEL_FORMAT.format(new Date(iso));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// "CRIT" (NHL uniquement) = fin de match serrée, toujours en cours. Magnus
// ne connaît que "LIVE". Voir toGameState dans magnus.ts et le filtre de
// getUpcomingGames dans nhl.ts / magnus.ts pour la même logique côté données.
export function isLive(game: Game): boolean {
  return game.gameState === "LIVE" || game.gameState === "CRIT";
}

export function isFinished(game: Game): boolean {
  return game.gameState === "OFF";
}
