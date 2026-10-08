import Link from "next/link";
import TeamBadge from "@/components/TeamBadge";
import type { StandingsGroup } from "@/lib/standings";

// Score d'un match en cours pour une équipe du classement (null tant que le
// score n'est pas connu, voir scoreUnavailable côté Magnus).
export type LiveGame = {
  opponent: string;
  teamScore: number | null;
  opponentScore: number | null;
};

const COLUMNS = {
  nhl: [
    ["MJ", "Matchs joués"],
    ["V", "Victoires"],
    ["D", "Défaites"],
    ["DP", "Défaites en prolongation ou aux tirs au but"],
  ],
  magnus: [
    ["MJ", "Matchs joués"],
    ["V", "Victoires"],
    ["VP", "Victoires en prolongation ou aux tirs au but"],
    ["DP", "Défaites en prolongation ou aux tirs au but"],
    ["D", "Défaites"],
  ],
} as const;

export default function StandingsTable({
  groups,
  league,
  live,
}: {
  groups: StandingsGroup[];
  league: "nhl" | "magnus";
  live: Map<string, LiveGame>;
}) {
  if (groups.length === 0) {
    return (
      <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
        Classement indisponible pour le moment. Réessaie dans quelques minutes.
      </p>
    );
  }

  const columns = COLUMNS[league];

  return (
    <div className="space-y-4">
      <p className="flex flex-wrap items-center justify-center gap-x-2 text-[11px] text-neutral-500">
        <span>Mis à jour en direct</span>
        {live.size > 0 && (
          <span className="inline-flex items-center gap-1">
            ·
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </span>
            en train de jouer
          </span>
        )}
      </p>

      {groups.map((group) => (
        <section key={group.title} className="space-y-2">
          <h3 className="text-sm font-medium text-neutral-400">{group.title}</h3>
          <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-[10px] uppercase tracking-wide text-neutral-500">
                  <th className="w-6 py-2 pl-2 text-left font-medium">#</th>
                  <th className="py-2 text-left font-medium">Équipe</th>
                  {columns.map(([label, title]) => (
                    <th key={label} title={title} className="w-7 py-2 text-center font-medium">
                      {label}
                    </th>
                  ))}
                  <th className="w-9 py-2 pr-2 text-right font-medium">Pts</th>
                </tr>
              </thead>
              <tbody>
                {group.rows.map((row) => {
                  const game = live.get(row.abbrev);
                  const values =
                    league === "nhl"
                      ? [row.gamesPlayed, row.wins, row.losses, row.otLosses]
                      : [row.gamesPlayed, row.wins, row.otWins ?? 0, row.otLosses, row.losses];
                  return (
                    <tr key={row.abbrev} className="border-t border-neutral-800">
                      <td className="py-2 pl-2 text-neutral-500">{row.rank}</td>
                      <td className="max-w-0 py-1.5">
                        <Link
                          href={`/matches/equipe/${league}/${row.abbrev}`}
                          prefetch={false}
                          className="flex items-center gap-2 transition-opacity active:opacity-70"
                        >
                          <TeamBadge abbrev={row.abbrev} name={row.name} size={24} league={league} />
                          <span className="min-w-0">
                            <span className="block truncate text-[13px] font-medium text-neutral-200">
                              {row.shortName}
                            </span>
                            {game && (
                              <span className="flex items-center gap-1 text-[10px] text-red-400">
                                <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-red-500" />
                                {game.teamScore !== null && game.opponentScore !== null
                                  ? `${game.teamScore}-${game.opponentScore} vs ${game.opponent}`
                                  : `en direct vs ${game.opponent}`}
                              </span>
                            )}
                          </span>
                        </Link>
                      </td>
                      {values.map((value, i) => (
                        <td key={columns[i][0]} className="text-center text-neutral-400">
                          {value}
                        </td>
                      ))}
                      <td className="pr-2 text-right text-sm font-bold text-sky-400">
                        {row.points}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="text-center text-[11px] leading-relaxed text-neutral-600">
        {columns.map(([label, title]) => `${label} : ${title.toLowerCase()}`).join(" · ")}
      </p>
    </div>
  );
}
