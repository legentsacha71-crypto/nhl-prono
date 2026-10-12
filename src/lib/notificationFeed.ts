import { formatDayLabel, formatTime, parisDateKey } from "./gameDates";

// Données de la page Notifications (src/app/notifications/page.tsx) : les
// résultats des pronos, les pronos encore en jeu et l'activité des amis et
// des ligues. Les cartes elles-mêmes sont dans NotificationFeed.tsx.

export type League = "nhl" | "magnus";

export type ResultItem = {
  gameId: number;
  league: League;
  homeAbbrev: string;
  awayAbbrev: string;
  // Score après 60 minutes, celui qu'on pronostique.
  homeScore: number;
  awayScore: number;
  predictedHome: number;
  predictedAway: number;
  points: number;
  basePoints: number | null;
  bonusPoints: number | null;
  isExactScore: boolean;
  boosted: boolean;
  isNew: boolean;
};

export type PendingStatus = "live" | "awaiting" | "upcoming";

export type PendingItem = {
  gameId: number;
  league: League;
  homeAbbrev: string;
  awayAbbrev: string;
  predictedHome: number;
  predictedAway: number;
  startTime: string;
  status: PendingStatus;
  // Score en direct (live) ou final (awaiting) ; null s'il n'est pas connu.
  homeScore: number | null;
  awayScore: number | null;
};

export type ActivityKind = "friend-request" | "friend-accepted" | "league-join" | "other";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  // Pseudo du joueur en tête de message, mis en gras ; null si inconnu.
  name: string | null;
  text: string;
  createdAt: string;
  unread: boolean;
};

// Une "nuit" de hockey va de midi à midi, heure de Paris : un match de
// Ligue Magnus à 20 h et un match NHL à 1 h du matin appartiennent à la
// même soirée.
const NIGHT_OFFSET_MS = 12 * 60 * 60 * 1000;

function shiftToNight(iso: string): string {
  return new Date(new Date(iso).getTime() - NIGHT_OFFSET_MS).toISOString();
}

export function nightKey(iso: string | null): string {
  return iso ? parisDateKey(shiftToNight(iso)) : "unknown";
}

export function nightLabel(iso: string | null): string {
  return iso ? formatDayLabel(shiftToNight(iso)) : "Date inconnue";
}

// Message créé par /api/grade-games : "MTL – TOR : tu as gagné 45 points…".
// Ces notifications sont remplacées par les cartes de résultat ; on ne s'en
// sert plus que pour savoir quels résultats sont nouveaux.
const POINTS_MESSAGE = /^(\S+) – (\S+) : tu as gagné /;

export function pointsNotificationKey(message: string): string | null {
  const match = POINTS_MESSAGE.exec(message);
  return match ? `${match[1]}-${match[2]}` : null;
}

export function matchupKey(homeAbbrev: string, awayAbbrev: string): string {
  return `${homeAbbrev}-${awayAbbrev}`;
}

// Messages créés par src/app/profil/actions.ts et src/app/leagues/actions.ts.
const ACTIVITY_PATTERNS: {
  kind: ActivityKind;
  pattern: RegExp;
  text: (match: RegExpExecArray) => string;
}[] = [
  {
    kind: "friend-request",
    pattern: /^(.+?) t'a envoyé une demande d'ami\.$/,
    text: () => "t'a envoyé une demande d'ami",
  },
  {
    kind: "friend-accepted",
    pattern: /^(.+?) a accepté ta demande d'ami\.$/,
    text: () => "a accepté ta demande d'ami",
  },
  {
    kind: "league-join",
    pattern: /^(.+?) a rejoint ta ligue "(.+)"\.$/,
    text: (match) => `a rejoint ta ligue « ${match[2]} »`,
  },
];

export function toActivityItem(notification: {
  id: string;
  message: string;
  created_at: string;
  read_at: string | null;
}): ActivityItem {
  const base = {
    id: notification.id,
    createdAt: notification.created_at,
    unread: !notification.read_at,
  };
  for (const { kind, pattern, text } of ACTIVITY_PATTERNS) {
    const match = pattern.exec(notification.message);
    if (match) return { ...base, kind, name: match[1], text: text(match) };
  }
  return { ...base, kind: "other", name: null, text: notification.message };
}

export function relativeTime(iso: string, now: Date): string {
  const minutes = Math.floor((now.getTime() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  if (hours < 48) return "hier";
  return formatDayLabel(iso);
}

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(toKey) - Date.parse(fromKey)) / 86400000);
}

// "Ce soir · 20:30", "Cette nuit · 01:00", "Demain · 19:00", "ven. 17 oct. · 01:00".
export function kickoffLabel(iso: string, now: Date): string {
  const time = formatTime(iso);
  const days = daysBetween(parisDateKey(now.toISOString()), parisDateKey(iso));
  const hour = Number(time.slice(0, 2));
  if (days === 0 && hour < 6) return `Cette nuit · ${time}`;
  if (days === 0) return `${hour >= 17 ? "Ce soir" : "Aujourd'hui"} · ${time}`;
  if (days === 1 && hour < 12) return `Cette nuit · ${time}`;
  if (days === 1) return `Demain · ${time}`;
  return `${formatDayLabel(iso)} · ${time}`;
}
