// Semaine de classement : du lundi 00h00 au lundi suivant 00h00, heure de
// Paris (les changements d'heure d'été/hiver sont pris en compte : une
// semaine peut durer 167 ou 169 heures).
const PARIS = "Europe/Paris";

const PARTS_FORMAT = new Intl.DateTimeFormat("en-US", {
  timeZone: PARIS,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  weekday: "short",
});
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const WEEKDAY_DAY_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  timeZone: PARIS,
});
const FULL_DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: PARIS,
});

export type WeekBounds = { start: Date; end: Date };

function parisParts(date: Date) {
  const parts = Object.fromEntries(
    PARTS_FORMAT.formatToParts(date).map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    weekday: WEEKDAYS.indexOf(parts.weekday),
  };
}

function parisOffsetMinutes(date: Date): number {
  const p = parisParts(date);
  const wallClockAsUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  return (wallClockAsUTC - Math.floor(date.getTime() / 60_000) * 60_000) / 60_000;
}

// Minuit (heure de Paris) du jour donné, en instant UTC. Le décalage est lu à
// midi : les changements d'heure ont lieu la nuit, jamais à minuit pile.
function parisMidnightUTC(year: number, month: number, day: number): Date {
  const noon = new Date(Date.UTC(year, month - 1, day, 12));
  return new Date(Date.UTC(year, month - 1, day) - parisOffsetMinutes(noon) * 60_000);
}

// weeksAgo = 0 : la semaine en cours ; 1 : la précédente ; etc.
export function parisWeekBounds(now: Date = new Date(), weeksAgo = 0): WeekBounds {
  const { year, month, day, weekday } = parisParts(now);
  const monday = day - ((weekday + 6) % 7) - 7 * weeksAgo;
  return {
    start: parisMidnightUTC(year, month, monday),
    end: parisMidnightUTC(year, month, monday + 7),
  };
}

// "lundi 21 au dimanche 27 septembre" (ou "lundi 28 septembre au dimanche
// 4 octobre" quand la semaine chevauche deux mois).
export function formatWeekRange({ start, end }: WeekBounds): string {
  const lastDay = new Date(end.getTime() - 12 * 60 * 60_000);
  const sameMonth = parisParts(start).month === parisParts(lastDay).month;
  const from = sameMonth
    ? WEEKDAY_DAY_FORMAT.format(start)
    : FULL_DATE_FORMAT.format(start);
  return `${from} au ${FULL_DATE_FORMAT.format(lastDay)}`;
}
