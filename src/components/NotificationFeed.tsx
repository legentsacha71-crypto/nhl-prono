import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, Check, Flame, Target, Trophy, UserCheck, UserPlus, X } from "lucide-react";
import TeamBadge from "@/components/TeamBadge";
import { pointsBreakdown, shortNhlName } from "@/components/RecentPredictions";
import { getMagnusTeamName } from "@/lib/magnusTeams";
import { getTeamName } from "@/lib/nhlTeams";
import {
  kickoffLabel,
  relativeTime,
  type ActivityItem,
  type League,
  type PendingItem,
  type ResultItem,
} from "@/lib/notificationFeed";

// Cartes de la page Notifications : résultat d'un prono (score final, prono
// placé et points), pronos encore en jeu et activité des amis / ligues.

type Outcome = "exact" | "won" | "lost";

const OUTCOME = {
  exact: {
    label: "Score exact",
    Icon: Target,
    card: "border-amber-700/50 bg-gradient-to-br from-amber-500/15 via-neutral-900 to-neutral-900",
    chip: "bg-amber-400/15 text-amber-300",
    divider: "border-amber-900/40",
    prediction: "text-amber-200",
    points: "text-amber-300",
    detail: "text-amber-600",
    dot: "bg-amber-400",
  },
  won: {
    label: "Bon vainqueur",
    Icon: Check,
    card: "border-neutral-800 bg-neutral-900 shadow-[inset_3px_0_0_#10b981]",
    chip: "bg-emerald-400/10 text-emerald-400",
    divider: "border-neutral-800",
    prediction: "text-neutral-200",
    points: "text-emerald-400",
    detail: "text-neutral-500",
    dot: "bg-emerald-500",
  },
  lost: {
    label: "Raté",
    Icon: X,
    card: "border-neutral-800/70 bg-neutral-900/60 shadow-[inset_3px_0_0_#404040]",
    chip: "bg-neutral-800 text-neutral-400",
    divider: "border-neutral-800/70",
    prediction: "text-neutral-500",
    points: "text-neutral-600",
    detail: "text-neutral-600",
    dot: "bg-neutral-700",
  },
} as const;

function outcomeOf(item: Pick<ResultItem, "isExactScore" | "points">): Outcome {
  if (item.isExactScore) return "exact";
  return item.points > 0 ? "won" : "lost";
}

// Récap de la dernière nuit jouée, dans l'en-tête de la page : total des
// points et une pastille par prono (or = score exact, vert = bon vainqueur).
export function NightRecap({
  label,
  rank,
  results,
}: {
  label: string;
  rank: number;
  results: Pick<ResultItem, "gameId" | "isExactScore" | "points">[];
}) {
  const points = results.reduce((sum, r) => sum + r.points, 0);
  const wins = results.filter((r) => r.points > 0).length;
  return (
    <div className="mt-4 border-t border-sky-900/40 pt-4">
      <div className="flex items-baseline justify-between text-[11px] uppercase tracking-[0.16em]">
        <span className="font-semibold text-sky-300">Ta nuit · {label}</span>
        {rank > 0 && <span className="text-neutral-500">#{rank} au général</span>}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="font-display text-5xl leading-none tracking-wide text-sky-400 tabular-nums">
          +{points}
          <span className="ml-1.5 text-xl text-sky-300/80">pts</span>
        </p>
        <div className="text-right">
          <div className="mb-1.5 flex flex-wrap justify-end gap-1">
            {results.map((r) => (
              <span key={r.gameId} className={`h-3 w-3 rounded-full ${OUTCOME[outcomeOf(r)].dot}`} />
            ))}
          </div>
          <p className="text-[11px] text-neutral-400">
            {wins} prono{wins > 1 ? "s" : ""} réussi{wins > 1 ? "s" : ""} sur {results.length}
          </p>
        </div>
      </div>
    </div>
  );
}

function teamNames(abbrev: string, league: League) {
  const full = league === "magnus" ? getMagnusTeamName(abbrev) : getTeamName(abbrev);
  return { full, short: league === "magnus" ? full : shortNhlName(full) };
}

function TeamSide({
  abbrev,
  league,
  side,
  tone,
  size = 30,
}: {
  abbrev: string;
  league: League;
  side: "home" | "away";
  tone: string;
  size?: number;
}) {
  const { full, short } = teamNames(abbrev, league);
  return (
    <Link
      href={`/matches/equipe/${league}/${abbrev}`}
      prefetch={false}
      className={`flex min-w-0 items-center gap-2 transition-opacity active:opacity-70 ${
        side === "away" ? "flex-row-reverse text-right" : ""
      }`}
    >
      <TeamBadge abbrev={abbrev} name={full} size={size} league={league} />
      <span className={`truncate text-[13px] ${tone}`}>{short}</span>
    </Link>
  );
}

function NewBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-sky-300">
      <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
      Nouveau
    </span>
  );
}

export function ResultCard({ item }: { item: ResultItem }) {
  const style = OUTCOME[outcomeOf(item)];
  const homeWon = item.homeScore > item.awayScore;
  const awayWon = item.awayScore > item.homeScore;
  const tone = (won: boolean, lost: boolean) =>
    won ? "font-semibold text-neutral-50" : lost ? "text-neutral-400" : "text-neutral-200";
  const breakdown = pointsBreakdown(item);

  return (
    <li className={`rounded-2xl border p-3.5 ${style.card}`}>
      <div className="mb-2.5 flex items-center justify-between">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${style.chip}`}
        >
          <style.Icon className="h-3 w-3" strokeWidth={3} aria-hidden="true" />
          {style.label}
        </span>
        {item.isNew && <NewBadge />}
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <TeamSide abbrev={item.homeAbbrev} league={item.league} side="home" tone={tone(homeWon, awayWon)} />
        <span className="font-display text-3xl leading-none tracking-wide text-neutral-50 tabular-nums">
          {item.homeScore} – {item.awayScore}
        </span>
        <TeamSide abbrev={item.awayAbbrev} league={item.league} side="away" tone={tone(awayWon, homeWon)} />
      </div>

      <div className={`mt-3 flex items-center justify-between border-t pt-2.5 ${style.divider}`}>
        <p className="text-xs text-neutral-500">
          Ton prono
          <span className={`ml-2 font-display text-xl tracking-wide tabular-nums ${style.prediction}`}>
            {item.predictedHome} – {item.predictedAway}
          </span>
        </p>
        <div className="text-right">
          <p className={`font-display text-3xl leading-none tracking-wide tabular-nums ${style.points}`}>
            {item.boosted && item.points > 0 && (
              <Flame className="mr-1 inline h-4 w-4 -translate-y-1 text-orange-400" aria-label="Boost x2" />
            )}
            {item.points > 0 ? `+${item.points}` : "0"}
            <span className="ml-1 text-sm opacity-70">pts</span>
          </p>
          {breakdown && <p className={`mt-0.5 text-[11px] ${style.detail}`}>{breakdown}</p>}
        </div>
      </div>
    </li>
  );
}

function PendingStatusLabel({ item, now }: { item: PendingItem; now: Date }) {
  if (item.status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold uppercase tracking-wide text-red-400">
        <span className="relative flex h-1.5 w-1.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
          <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
        </span>
        En direct
      </span>
    );
  }
  if (item.status === "awaiting") {
    return <span className="text-neutral-400">Terminé · points en cours de calcul</span>;
  }
  return <span className="text-neutral-400">{kickoffLabel(item.startTime, now)}</span>;
}

function PendingRow({ item, now }: { item: PendingItem; now: Date }) {
  const hasScore = item.status !== "upcoming" && item.homeScore !== null && item.awayScore !== null;
  return (
    <li className="px-3.5 py-3">
      <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
        <TeamSide abbrev={item.homeAbbrev} league={item.league} side="home" tone="text-neutral-200" size={26} />
        {hasScore ? (
          <span
            className={`font-display text-2xl leading-none tracking-wide tabular-nums ${
              item.status === "live" ? "text-red-400" : "text-neutral-100"
            }`}
          >
            {item.homeScore} – {item.awayScore}
          </span>
        ) : (
          <span className="font-display text-sm tracking-wider text-neutral-600">VS</span>
        )}
        <TeamSide abbrev={item.awayAbbrev} league={item.league} side="away" tone="text-neutral-200" size={26} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <p className="text-neutral-500">
          Ton prono
          <span className="ml-1.5 font-display text-base tracking-wide text-sky-300 tabular-nums">
            {item.predictedHome} – {item.predictedAway}
          </span>
        </p>
        <PendingStatusLabel item={item} now={now} />
      </div>
    </li>
  );
}

export function PendingList({
  items,
  moreCount,
  now,
}: {
  items: PendingItem[];
  moreCount: number;
  now: Date;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
      <ul className="divide-y divide-neutral-800">
        {items.map((item) => (
          <PendingRow key={item.gameId} item={item} now={now} />
        ))}
      </ul>
      {moreCount > 0 && (
        <Link
          href="/matches"
          prefetch={false}
          className="block border-t border-neutral-800 px-3.5 py-2.5 text-center text-xs text-sky-400 transition-opacity active:opacity-70"
        >
          + {moreCount} autre{moreCount > 1 ? "s" : ""} prono{moreCount > 1 ? "s" : ""} à venir
        </Link>
      )}
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
