import TeamBadge from "@/components/TeamBadge";
import { isMagnusGameId } from "@/lib/competition";
import { getMagnusTeamName } from "@/lib/magnusTeams";
import { getTeamName } from "@/lib/nhlTeams";

export type RecentPrediction = {
  gameId: number;
  predictedAway: number;
  predictedHome: number;
  points: number;
  isExactScore: boolean;
  boosted: boolean;
  gameStartTime: string | null;
  result: {
    awayAbbrev: string;
    homeAbbrev: string;
    regulationAwayScore: number;
    regulationHomeScore: number;
  } | null;
};

type PredictionRow = {
  game_id: number;
  away_score: number;
  home_score: number;
  points: number | null;
  is_exact_score: boolean | null;
  boosted: boolean | null;
  game_start_time: string | null;
};

export function latestPlayed<T extends { game_start_time: string | null }>(
  predictions: T[],
  limit = 8,
): T[] {
  return [...predictions]
    .sort((a, b) =>
      (b.game_start_time ?? "").localeCompare(a.game_start_time ?? ""),
    )
    .slice(0, limit);
}

export function toRecentPrediction(
  p: PredictionRow,
  result: RecentPrediction["result"],
): RecentPrediction {
  return {
    gameId: p.game_id,
    predictedAway: p.away_score,
    predictedHome: p.home_score,
    points: p.points ?? 0,
    isExactScore: Boolean(p.is_exact_score),
    boosted: Boolean(p.boosted),
    gameStartTime: p.game_start_time,
    result: result && {
      awayAbbrev: result.awayAbbrev,
      homeAbbrev: result.homeAbbrev,
      regulationAwayScore: result.regulationAwayScore,
      regulationHomeScore: result.regulationHomeScore,
    },
  };
}

const PARIS = "Europe/Paris";
const COLUMNS =
  "grid grid-cols-[minmax(0,1fr)_2.25rem_2.25rem_5rem] items-center gap-x-1.5";

const TWO_WORD_NICKNAMES = ["Blue Jackets", "Red Wings", "Maple Leafs", "Golden Knights"];

// "Boston Bruins" -> "Bruins" : le nom complet est tronqué sur mobile.
function shortNhlName(name: string) {
  return (
    TWO_WORD_NICKNAMES.find((nickname) => name.endsWith(nickname)) ??
    name.split(" ").pop() ??
    name
  );
}

function dayKey(iso: string | null) {
  if (!iso) return "unknown";
  return new Date(iso).toLocaleDateString("fr-CA", { timeZone: PARIS });
}

function dayLabel(iso: string | null) {
  if (!iso) return "Date inconnue";
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: PARIS,
  });
}

const STATUS = {
  exact: {
    label: "🎯 Score exact",
    pointsClass: "text-amber-300",
    labelClass: "text-amber-400/90",
  },
  won: {
    label: "✓ Bon vainqueur",
    pointsClass: "text-emerald-400",
    labelClass: "text-emerald-500/90",
  },
  lost: {
    label: "✗ Raté",
    pointsClass: "text-neutral-500",
    labelClass: "text-neutral-600",
  },
} as const;

function TeamLine({
  abbrev,
  league,
  won,
}: {
  abbrev: string;
  league: "nhl" | "magnus";
  won: boolean;
}) {
  const fullName =
    league === "magnus" ? getMagnusTeamName(abbrev) : getTeamName(abbrev);
  const name = league === "magnus" ? fullName : shortNhlName(fullName);
  return (
    <div className="flex h-6 items-center gap-1.5">
      <TeamBadge abbrev={abbrev} name={fullName} size={24} league={league} />
      <span
        className={`truncate text-[12.5px] ${
          won ? "font-semibold text-neutral-100" : "text-neutral-400"
        }`}
      >
        {name}
      </span>
    </div>
  );
}

function PredictionRowView({ item }: { item: RecentPrediction }) {
  const { result } = item;
  const league = isMagnusGameId(item.gameId) ? "magnus" : "nhl";
  const status = item.isExactScore ? "exact" : item.points > 0 ? "won" : "lost";
  const style = STATUS[status];
  const awayWon = result ? result.regulationAwayScore > result.regulationHomeScore : false;
  const homeWon = result ? result.regulationHomeScore > result.regulationAwayScore : false;
  const predictionTone =
    status === "exact" ? "text-amber-300" : "text-neutral-400";

  return (
    <li className={`${COLUMNS} py-2.5`}>
      {result ? (
        <div className="flex flex-col gap-1.5">
          <TeamLine abbrev={result.awayAbbrev} league={league} won={awayWon} />
          <TeamLine abbrev={result.homeAbbrev} league={league} won={homeWon} />
        </div>
      ) : (
        <span className="text-[13px] text-neutral-400">Match #{item.gameId}</span>
      )}

      <div className="flex flex-col items-center gap-1.5 font-display text-xl leading-6">
        <span className={awayWon ? "text-neutral-50" : "text-neutral-500"}>
          {result ? result.regulationAwayScore : "–"}
        </span>
        <span className={homeWon ? "text-neutral-50" : "text-neutral-500"}>
          {result ? result.regulationHomeScore : "–"}
        </span>
      </div>

      <div
        className={`flex flex-col items-center gap-1.5 text-sm leading-6 tabular-nums ${predictionTone}`}
      >
        <span>{item.predictedAway}</span>
        <span>{item.predictedHome}</span>
      </div>

      <div className="text-right">
        <p className={`text-base font-semibold tabular-nums ${style.pointsClass}`}>
          {item.boosted && item.points > 0 && (
            <span className="mr-1 text-xs" title="Boost x2">
              🔥
            </span>
          )}
          {item.points > 0 ? `+${item.points}` : "0"}
          <span className="ml-0.5 text-[10px] font-medium opacity-70">pts</span>
        </p>
        <p className={`mt-0.5 text-[10px] leading-tight font-medium ${style.labelClass}`}>
          {style.label}
        </p>
      </div>
    </li>
  );
}

// Liste des derniers matchs joués d'un joueur : mini-tableau d'affichage
// (équipes + score réel), le prono placé à côté et les points gagnés avec
// leur raison (score exact / bon vainqueur / raté), regroupés par jour.
export default function RecentPredictions({
  items,
}: {
  items: RecentPrediction[];
}) {
  const groups: { key: string; label: string; items: RecentPrediction[] }[] = [];
  for (const item of items) {
    const key = dayKey(item.gameStartTime);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push(item);
    } else {
      groups.push({ key, label: dayLabel(item.gameStartTime), items: [item] });
    }
  }

  return (
    <div>
      <div
        className={`${COLUMNS} px-0 pb-1.5 text-[10px] font-medium tracking-wide text-neutral-600 uppercase`}
        aria-hidden="true"
      >
        <span>Match</span>
        <span className="text-center">Score</span>
        <span className="text-center">Prono</span>
        <span className="text-right">Points</span>
      </div>

      {groups.map((group) => (
        <div key={group.key}>
          <p className="border-t border-neutral-800/60 pt-2 pb-0.5 text-[11px] font-semibold tracking-wide text-neutral-500 uppercase">
            {group.label}
          </p>
          <ul className="divide-y divide-neutral-800/40">
            {group.items.map((item) => (
              <PredictionRowView key={item.gameId} item={item} />
            ))}
          </ul>
        </div>
      ))}

      <p className="mt-2 text-[10px] text-neutral-600">
        Scores après 60 minutes (sans prolongation ni tirs au but).
      </p>
    </div>
  );
}
