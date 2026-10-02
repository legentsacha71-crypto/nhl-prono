import type { CalendarGame, CalendarMonth } from "@/components/CalendarMonths";
import {
  formatDayLabel,
  formatMonthLabel,
  formatTime,
  isFinished,
  isLive,
  parisDateKey,
  type Game,
} from "./gameDates";

// Calendrier complet d'une saison, regroupé par mois puis par jour, au format
// compact attendu par CalendarMonths. Servi à la demande par
// /api/calendar/[league] (plus de 1 300 matchs NHL : trop lourd pour être
// envoyé à chaque visite de l'onglet Matchs).

// Regroupe par mois (chacun affiché dans un <details> repliable, vu le
// volume de matchs sur une saison complète), puis par jour à l'intérieur.
// `hasUpcoming` sert à ouvrir automatiquement le premier mois contenant un
// match pas encore joué, pour atterrir directement sur "maintenant".
function groupByMonth(games: Game[]) {
  const now = Date.now();
  const months = new Map<
    string,
    {
      label: string;
      hasUpcoming: boolean;
      days: Map<string, { label: string; games: Game[] }>;
    }
  >();

  for (const game of games) {
    const date = new Date(game.startTimeUTC);
    const dayKey = parisDateKey(game.startTimeUTC);
    const monthKey = dayKey.slice(0, 7);
    if (!months.has(monthKey)) {
      months.set(monthKey, {
        label: formatMonthLabel(game.startTimeUTC),
        hasUpcoming: false,
        days: new Map(),
      });
    }
    const month = months.get(monthKey)!;
    if (date.getTime() > now) {
      month.hasUpcoming = true;
    }

    if (!month.days.has(dayKey)) {
      month.days.set(dayKey, {
        label: formatDayLabel(game.startTimeUTC),
        games: [],
      });
    }
    month.days.get(dayKey)!.games.push(game);
  }

  return [...months.values()].map((month) => ({
    label: month.label,
    hasUpcoming: month.hasUpcoming,
    days: [...month.days.values()],
  }));
}

function toCalendarGame(game: Game): CalendarGame {
  // Le score Ligue Magnus est déjà rempli (à 0-0) pour les matchs pas
  // encore commencés : se fier à sa seule présence classerait à tort tout
  // le calendrier à venir comme "terminé". `gameState` est la source fiable.
  const status = isFinished(game)
    ? "final"
    : isLive(game)
      ? "live"
      : "scheduled";
  return {
    id: game.id,
    awayAbbrev: game.awayTeam.abbrev,
    awayName: game.awayTeam.name,
    homeAbbrev: game.homeTeam.abbrev,
    homeName: game.homeTeam.name,
    status,
    label:
      status === "scheduled"
        ? `${formatTime(game.startTimeUTC)}${game.isProvisional ? " ?" : ""}`
        : `${game.homeTeam.score ?? 0} - ${game.awayTeam.score ?? 0}`,
    provisional: Boolean(game.isProvisional),
  };
}

// Données compactes pour CalendarMonths (composant client) : seul le mois
// "en cours" est ouvert, les autres ne construisent leurs lignes qu'au clic.
export function toCalendarMonths(games: Game[]): CalendarMonth[] {
  const groups = groupByMonth(games);
  const firstUpcomingIndex = groups.findIndex((g) => g.hasUpcoming);
  return groups.map((group, index) => ({
    label: group.label,
    open: index === firstUpcomingIndex,
    days: group.days.map((day) => ({
      label: day.label,
      games: day.games.map(toCalendarGame),
    })),
  }));
}
