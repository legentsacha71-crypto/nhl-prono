import Link from "next/link";
import TeamBadge from "@/components/TeamBadge";
import TeamForm from "@/components/TeamForm";
import StandingsViews from "@/components/StandingsViews";
import type { StandingRow, StandingZone, StandingsBlock } from "@/lib/standings";
import type { FormGame, TeamFormMap } from "@/lib/teamForm";

// Score d'un match en cours pour une équipe du classement (null tant que le
// score n'est pas connu, voir scoreUnavailable côté Magnus).
export type LiveGame = {
  opponent: string;
  teamScore: number | null;
  opponentScore: number | null;
};

// Une vue du classement (Global, Domicile, Extérieur) : ses tableaux et les
// matchs à garder pour la colonne "Forme".
export type StandingsView = {
  key: string;
  label: string;
  blocks: StandingsBlock[];
  formFilter?: "home" | "road";
};

const ZONE_RGB: Record<StandingZone, { rgb: string; solid: string }> = {
  playoffs: { rgb: "16,185,129", solid: "#10b981" },
  playdown: { rgb: "239,68,68", solid: "#ef4444" },
};

const ZONE_LABEL: Record<StandingZone, string> = {
  playoffs: "Qualification playoffs",
  playdown: "Poule de maintien",
};

// Colonnes comme sur Flashscore. Sur téléphone elles ne tiennent pas toutes :
// le rang et l'équipe restent fixes à gauche, les points à droite, et le
// reste défile horizontalement.
const STAT_COLUMNS: { label: string; title: string; value: (r: StandingRow) => string | number }[] = [
  { label: "MJ", title: "Matchs joués", value: (r) => r.gamesPlayed },
  { label: "V", title: "Victoires", value: (r) => r.wins },
  { label: "VP", title: "Victoires en prolongation ou aux tirs au but", value: (r) => r.otWins },
  { label: "DP", title: "Défaites en prolongation ou aux tirs au but", value: (r) => r.otLosses },
  { label: "D", title: "Défaites", value: (r) => r.losses },
  { label: "B", title: "Buts marqués : buts encaissés", value: (r) => `${r.goalsFor}:${r.goalsAgainst}` },
];

const TEMPLATE = "2rem 7.5rem repeat(5, 1.9rem) 3.3rem 4.6rem 2.6rem";
const MIN_WIDTH = "29.5rem";
const CELL_BG = "#171717"; // neutral-900, fond des colonnes fixes

function zoneTint(zone: StandingZone | undefined, from: number, to: number): string | undefined {
  if (!zone) return undefined;
  const { rgb } = ZONE_RGB[zone];
  return `linear-gradient(90deg, rgba(${rgb},${from}) 0%, rgba(${rgb},${to}) 100%)`;
}

function formFor(
  games: FormGame[] | undefined,
  filter: StandingsView["formFilter"],
): FormGame[] | undefined {
  if (!games || !filter) return games;
  return games.filter((g) => (filter === "home" ? g.home : !g.home));
}

function Table({
  title,
  rows,
  league,
  live,
  form,
  formFilter,
}: {
  title: string;
  rows: StandingRow[];
  league: "nhl" | "magnus";
  live: Map<string, LiveGame>;
  form: TeamFormMap;
  formFilter: StandingsView["formFilter"];
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-neutral-300">{title}</h3>
      <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900">
        <div data-no-swipe className="overflow-x-auto overscroll-x-contain">
          <div role="table" aria-label={title} className="text-xs tabular-nums" style={{ minWidth: MIN_WIDTH }}>
            <div
              role="row"
              className="grid items-center text-[10px] uppercase tracking-wide text-neutral-500"
              style={{ gridTemplateColumns: TEMPLATE }}
            >
              <span role="columnheader" className="sticky left-0 z-10 py-2 pl-2.5" style={{ background: CELL_BG }}>
                #
              </span>
              <span role="columnheader" className="sticky left-8 z-10 py-2" style={{ background: CELL_BG }}>
                Équipe
              </span>
              {STAT_COLUMNS.map((c) => (
                <span key={c.label} role="columnheader" title={c.title} className="py-2 text-center">
                  {c.label}
                </span>
              ))}
              <span role="columnheader" className="py-2 text-center">
                Forme
              </span>
              <span
                role="columnheader"
                className="sticky right-0 z-10 py-2 pr-2 text-right shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.6)]"
                style={{ background: CELL_BG }}
              >
                Pts
              </span>
            </div>

            {rows.map((row) => {
              const game = live.get(row.abbrev);
              return (
                <div
                  key={row.abbrev}
                  role="row"
                  className="grid items-center border-t border-neutral-800"
                  style={{ gridTemplateColumns: TEMPLATE, background: zoneTint(row.zone, 0.12, 0) }}
                >
                  <span
                    role="cell"
                    className="sticky left-0 z-10 flex h-full items-center pl-2.5 text-neutral-500"
                    style={{
                      background: row.zone ? `${zoneTint(row.zone, 0.26, 0.2)}, ${CELL_BG}` : CELL_BG,
                      boxShadow: row.zone ? `inset 3px 0 0 ${ZONE_RGB[row.zone].solid}` : undefined,
                    }}
                  >
                    {row.rank}
                  </span>
                  <span
                    role="cell"
                    className="sticky left-8 z-10 flex h-full min-w-0 items-center py-1.5"
                    style={{
                      background: row.zone ? `${zoneTint(row.zone, 0.2, 0.12)}, ${CELL_BG}` : CELL_BG,
                    }}
                  >
                    <Link
                      href={`/matches/equipe/${league}/${row.abbrev}`}
                      prefetch={false}
                      className="flex min-w-0 items-center gap-2 pr-1 transition-opacity active:opacity-70"
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
                              ? `${game.teamScore}-${game.opponentScore}`
                              : "en direct"}
                          </span>
                        )}
                      </span>
                    </Link>
                  </span>
                  {STAT_COLUMNS.map((c) => (
                    <span key={c.label} role="cell" className="text-center text-neutral-400">
                      {c.value(row)}
                    </span>
                  ))}
                  <span role="cell" className="flex justify-center">
                    <TeamForm games={formFor(form.get(row.abbrev), formFilter)} />
                  </span>
                  <span
                    role="cell"
                    className="sticky right-0 z-10 flex h-full items-center justify-end pr-2 text-sm font-bold text-sky-400 shadow-[-6px_0_8px_-6px_rgba(0,0,0,0.6)]"
                    style={{ background: CELL_BG }}
                  >
                    {row.points}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function StandingsPanel({
  league,
  views,
  live,
  form,
}: {
  league: "nhl" | "magnus";
  views: StandingsView[];
  live: Map<string, LiveGame>;
  form: TeamFormMap;
}) {
  const hasData = views.some((v) => v.blocks.some((b) => b.tables.length > 0));
  if (!hasData) {
    return (
      <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
        Classement indisponible pour le moment. Réessaie dans quelques minutes.
      </p>
    );
  }

  const zones = (["playoffs", "playdown"] as const).filter((zone) =>
    views.some((v) => v.blocks.some((b) => b.tables.some((t) => t.rows.some((r) => r.zone === zone)))),
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5 text-[11px] text-neutral-500">
        <p className="flex flex-wrap items-center justify-center gap-x-2">
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
          <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {zones.map((zone) => (
              <span key={zone} className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: ZONE_RGB[zone].solid }} />
                {ZONE_LABEL[zone]}
              </span>
            ))}
          </p>
        )}
      </div>

      <StandingsViews
        views={views.map((view) => ({
          key: view.key,
          label: view.label,
          content: (
            <div className="space-y-6">
              {view.blocks.map((block, i) => (
                <div key={block.heading ?? i} className="space-y-4">
                  {block.heading && (
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                      {block.heading}
                    </p>
                  )}
                  {block.tables.map((table) => (
                    <Table
                      key={table.title}
                      title={table.title}
                      rows={table.rows}
                      league={league}
                      live={live}
                      form={form}
                      formFilter={view.formFilter}
                    />
                  ))}
                </div>
              ))}
            </div>
          ),
        }))}
      />
    </div>
  );
}
