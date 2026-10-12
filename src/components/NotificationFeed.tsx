import type { ReactNode } from "react";
import { Bell, Flame, Trophy, UserCheck, UserPlus } from "lucide-react";
import TeamBadge from "@/components/TeamBadge";
import { getMagnusTeamName } from "@/lib/magnusTeams";
import { getTeamName } from "@/lib/nhlTeams";
import {
  relativeTime,
  type ActivityItem,
  type League,
  type PendingItem,
  type ResultItem,
} from "@/lib/notificationFeed";

// Affichage de la page Notifications : une ligne par match pronostiqué
// (score, ton prono, points), le récap de la dernière nuit et l'activité
// des amis / ligues.

// Mêmes colonnes pour toutes les lignes : match, ton prono, points/état.
const ROW = "grid grid-cols-[minmax(0,1fr)_4rem_5rem] items-center gap-2";

function Matchup({
  league,
  homeAbbrev,
  awayAbbrev,
  homeScore,
  awayScore,
  scoreClass = "text-neutral-50",
}: {
  league: League;
  homeAbbrev: string;
  awayAbbrev: string;
  homeScore: number | null;
  awayScore: number | null;
  scoreClass?: string;
}) {
  const name = league === "magnus" ? getMagnusTeamName : getTeamName;
  return (
    <div className="flex items-center gap-2">
      <TeamBadge abbrev={homeAbbrev} name={name(homeAbbrev)} size={28} league={league} />
      <span className={`w-12 text-center font-display text-2xl leading-none tracking-wide tabular-nums ${scoreClass}`}>
        {homeScore !== null && awayScore !== null ? `${homeScore}-${awayScore}` : "–"}
      </span>
      <TeamBadge abbrev={awayAbbrev} name={name(awayAbbrev)} size={28} league={league} />
    </div>
  );
}

function Prediction({ home, away, className }: { home: number; away: number; className: string }) {
  return (
    <span className={`text-center font-display text-xl leading-none tracking-wide tabular-nums ${className}`}>
      {home}-{away}
    </span>
  );
}

// Carte d'une liste de lignes, avec son titre et les noms de colonnes.
export function RowCard({
  title,
  titleClass = "text-neutral-400",
  lastColumn,
  children,
}: {
  title: ReactNode;
  titleClass?: string;
  lastColumn: string;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
      <div className={`${ROW} border-b border-neutral-800 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-500`}>
        <span className={titleClass}>{title}</span>
        <span className="text-center">Prono</span>
        <span className="text-right">{lastColumn}</span>
      </div>
      <ul className="divide-y divide-neutral-800/70">{children}</ul>
    </div>
  );
}

export function ResultRow({ item }: { item: ResultItem }) {
  const exact = item.isExactScore;
  const won = item.points > 0;
  return (
    <li className={`relative px-3.5 py-2.5 ${ROW} ${exact ? "bg-amber-400/[0.08]" : ""}`}>
      {item.isNew && (
        <span className="absolute left-1 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-sky-400" aria-label="Nouveau" />
      )}
      <Matchup
        league={item.league}
        homeAbbrev={item.homeAbbrev}
        awayAbbrev={item.awayAbbrev}
        homeScore={item.homeScore}
        awayScore={item.awayScore}
      />
      <Prediction
        home={item.predictedHome}
        away={item.predictedAway}
        className={exact ? "text-amber-300" : won ? "text-neutral-200" : "text-neutral-500"}
      />
      <div className="text-right">
        <p
          className={`font-display text-2xl leading-none tracking-wide tabular-nums ${
            exact ? "text-amber-300" : won ? "text-emerald-400" : "text-neutral-600"
          }`}
        >
          {item.boosted && won && (
            <Flame className="mr-0.5 inline h-3.5 w-3.5 -translate-y-0.5 text-orange-400" aria-label="Boost x2" />
          )}
          {won ? `+${item.points}` : "0"}
        </p>
        {exact && (
          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-400">Score exact</p>
        )}
      </div>
    </li>
  );
}

export function LiveRow({ item }: { item: PendingItem }) {
  const live = item.status === "live";
  return (
    <li className={`px-3.5 py-2.5 ${ROW}`}>
      <Matchup
        league={item.league}
        homeAbbrev={item.homeAbbrev}
        awayAbbrev={item.awayAbbrev}
        homeScore={item.homeScore}
        awayScore={item.awayScore}
        scoreClass={live ? "text-red-400" : "text-neutral-50"}
      />
      <Prediction home={item.predictedHome} away={item.predictedAway} className="text-sky-300" />
      <span className="text-right text-[10px] font-semibold uppercase leading-tight tracking-wide">
        {live ? (
          <span className="inline-flex items-center gap-1.5 text-red-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            En direct
          </span>
        ) : (
          <span className="text-neutral-500">Terminé</span>
        )}
      </span>
    </li>
  );
}

// Récap de la dernière nuit jouée, dans l'en-tête de la page.
export function NightRecap({
  title,
  results,
}: {
  title: string;
  results: Pick<ResultItem, "points">[];
}) {
  const points = results.reduce((sum, r) => sum + r.points, 0);
  const wins = results.filter((r) => r.points > 0).length;
  return (
    <div className="mt-4 flex items-end justify-between gap-3 border-t border-sky-900/40 pt-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-300">{title}</p>
        <p className="mt-1 font-display text-5xl leading-none tracking-wide text-sky-400 tabular-nums">
          +{points}
          <span className="ml-1.5 text-xl text-sky-300/80">pts</span>
        </p>
      </div>
      <p className="pb-1 text-right text-sm text-neutral-300">
        <span className="font-display text-2xl tracking-wide text-neutral-50">
          {wins}/{results.length}
        </span>
        <span className="block text-[11px] text-neutral-500">pronos réussis</span>
      </p>
    </div>
  );
}

const ACTIVITY_ICON = {
  "friend-request": UserPlus,
  "friend-accepted": UserCheck,
  "league-join": Trophy,
  other: Bell,
} as const;

export function ActivityRow({ item, now }: { item: ActivityItem; now: Date }) {
  const Icon = ACTIVITY_ICON[item.kind];
  return (
    <li className="flex items-center gap-3 px-3.5 py-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
          item.unread ? "bg-sky-500/15 text-sky-300" : "bg-neutral-800 text-neutral-400"
        }`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <p className="min-w-0 flex-1 text-[13px] leading-snug text-neutral-400">
        {item.name && <span className="font-semibold text-neutral-100">{item.name} </span>}
        {item.text}
        <span className="mt-0.5 block text-[11px] text-neutral-600">{relativeTime(item.createdAt, now)}</span>
      </p>
      {item.unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" />}
    </li>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
      {children}
    </h2>
  );
}
