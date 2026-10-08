import Link from "next/link";
import TeamBadge from "@/components/TeamBadge";
import type { StandingZone, StandingsGroup } from "@/lib/standings";

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

// Couleur de chaque zone du classement, en dégradé depuis la gauche de la
// ligne, avec un liseré plein sur le bord.
const ZONE_RGB: Record<StandingZone, { rgb: string; solid: string }> = {
  playoffs: { rgb: "16,185,129", solid: "#10b981" },
  wildcard: { rgb: "56,189,248", solid: "#38bdf8" },
  playdown: { rgb: "239,68,68", solid: "#ef4444" },
};

const ZONE_LABEL: Record<StandingZone, string> = {
  playoffs: "Playoffs",
  wildcard: "Wild card",
  playdown: "Poule de maintien",
};

function zoneBackground(zone: StandingZone, strength: number): string {
  const { rgb } = ZONE_RGB[zone];
  return `linear-gradient(90deg, rgba(${rgb},${0.24 * strength}) 0%, rgba(${rgb},${0.08 * strength}) 55%, rgba(${rgb},0) 100%)`;
}

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
  const template = `1.75rem minmax(0,1fr) repeat(${columns.length},1.75rem) 2.5rem`;
  const zones = (["playoffs", "wildcard", "playdown"] as const).filter((zone) =>
    groups.some((g) =>
      g.sections.some((section) => section.rows.some((r) => r.zone === zone)),
    ),
  );

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

      {zones.length > 0 && (
        <p className="-mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
          {zones.map((zone) => (
            <span key={zone} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: ZONE_RGB[zone].solid }}
              />
              {ZONE_LABEL[zone]}
            </span>
          ))}
        </p>
      )}

      {groups.map((group) => (
        <section key={group.title} className="space-y-2">
          <h3 className="text-sm font-medium text-neutral-400">{group.title}</h3>
          <div
            role="table"
            aria-label={group.title}
            className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 text-xs tabular-nums"
          >
            <div
              role="row"
              className="grid items-center py-2 text-[10px] uppercase tracking-wide text-neutral-500"
              style={{ gridTemplateColumns: template }}
            >
              <span role="columnheader" className="pl-2.5">#</span>
              <span role="columnheader">Équipe</span>
              {columns.map(([label, title]) => (
                <span key={label} role="columnheader" title={title} className="text-center">
                  {label}
                </span>
              ))}
              <span role="columnheader" className="pr-2 text-right">Pts</span>
            </div>
            {group.sections.map((section) => [
              section.label && (
                <div
                  key={`label-${section.label}`}
                  role="row"
                  className="border-t border-neutral-800 bg-neutral-950/60 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-500"
                >
                  <span role="cell">{section.label}</span>
                </div>
              ),
              ...section.rows.map((row) => {
              const game = live.get(row.abbrev);
              const values =
                league === "nhl"
                  ? [row.gamesPlayed, row.wins, row.losses, row.otLosses]
                  : [row.gamesPlayed, row.wins, row.otWins ?? 0, row.otLosses, row.losses];
              return (
                <div
                  key={row.abbrev}
                  role="row"
                  className="grid items-center border-t border-neutral-800 py-1.5"
                  style={{
                    gridTemplateColumns: template,
                    ...(row.zone
                      ? {
                          background: zoneBackground(row.zone, 1),
                          boxShadow: `inset 3px 0 0 ${ZONE_RGB[row.zone].solid}`,
                        }
                      : {}),
                  }}
                >
                  <span role="cell" className="pl-2.5 text-neutral-500">
                    {row.rank}
                  </span>
                  <span role="cell" className="min-w-0">
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
                  </span>
                  {values.map((value, i) => (
                    <span key={columns[i][0]} role="cell" className="text-center text-neutral-400">
                      {value}
                    </span>
                  ))}
                  <span role="cell" className="pr-2 text-right text-sm font-bold text-sky-400">
                    {row.points}
                  </span>
                </div>
              );
              }),
            ])}
          </div>
        </section>
      ))}
    </div>
  );
}
