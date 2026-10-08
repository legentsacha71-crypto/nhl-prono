import Link from "next/link";
import { notFound } from "next/navigation";
import TopBar from "@/components/TopBar";
import TeamBadge from "@/components/TeamBadge";
import TeamForm from "@/components/TeamForm";
import { getUnreadCount } from "@/lib/unreadCount";
import { NHL_TEAMS, getTeamName } from "@/lib/nhlTeams";
import { MAGNUS_TEAMS, getMagnusTeamName } from "@/lib/magnusTeams";
import { formatDayLabel } from "@/lib/gameDates";
import { getTeamResults, type FormGame } from "@/lib/teamForm";

const RESULT_STYLE: Record<FormGame["result"], { dot: string; text: string }> = {
  W: { dot: "bg-emerald-500", text: "text-emerald-400" },
  L: { dot: "bg-red-500", text: "text-red-400" },
  D: { dot: "bg-amber-400", text: "text-amber-300" },
};

// Libellé du résultat final, prolongation / tirs au but compris ; la
// pastille, elle, suit le score après 60 min comme les pronostics.
function resultLabel(game: FormGame): string {
  const won = game.teamScore > game.opponentScore;
  const base = won ? "Victoire" : "Défaite";
  if (game.decidedIn === "OT") return `${base} (prol.)`;
  if (game.decidedIn === "SO") return `${base} (TAB)`;
  return base;
}

// Page d'une équipe, ouverte en touchant une équipe sur une carte de match :
// tous ses matchs joués cette saison, du plus récent au plus ancien.
export default async function TeamPage({
  params,
}: {
  params: Promise<{ league: string; abbrev: string }>;
}) {
  void getUnreadCount();
  const { league, abbrev: rawAbbrev } = await params;
  const abbrev = rawAbbrev.toUpperCase();
  if (league !== "nhl" && league !== "magnus") notFound();
  const known =
    league === "nhl"
      ? NHL_TEAMS.some((t) => t.abbrev === abbrev)
      : MAGNUS_TEAMS.some((t) => t.abbrev === abbrev);
  if (!known) notFound();

  const teamName = league === "nhl" ? getTeamName(abbrev) : getMagnusTeamName(abbrev);
  const opponentName = league === "nhl" ? getTeamName : getMagnusTeamName;
  const results = await getTeamResults(league, abbrev).catch(() => null);
  const games = results ? [...results].reverse() : [];

  const count = (r: FormGame["result"]) => games.filter((g) => g.result === r).length;

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-center shadow-xl shadow-black/30">
          <TeamBadge abbrev={abbrev} name={teamName} size={64} league={league} />
          <h1 className="text-xl font-bold text-neutral-50">{teamName}</h1>
          <p className="text-xs text-neutral-500">
            {league === "nhl" ? "NHL" : "Ligue Magnus"} · saison en cours
          </p>
          {games.length > 0 && (
            <>
              <TeamForm games={results ?? []} />
              <p className="text-sm text-neutral-300">
                <span className="text-emerald-400">{count("W")} V</span>
                {" · "}
                <span className="text-red-400">{count("L")} D</span>
                {" · "}
                <span className="text-amber-300">
                  {count("D")} égalité{count("D") > 1 ? "s" : ""}
                </span>
                <span className="text-neutral-500"> après 60 min</span>
              </p>
            </>
          )}
        </div>

        {results === null ? (
          <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
            Impossible de charger les résultats pour le moment. Réessaie dans
            quelques minutes.
          </p>
        ) : games.length === 0 ? (
          <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
            Aucun match joué cette saison pour l&apos;instant.
          </p>
        ) : (
          <ul className="space-y-2">
            {games.map((game) => {
              const style = RESULT_STYLE[game.result];
              return (
                <li
                  key={game.startTimeUTC}
                  className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3"
                >
                  <span
                    className={`h-3 w-3 shrink-0 rounded-full ${style.dot}`}
                    aria-hidden="true"
                  />
                  <TeamBadge
                    abbrev={game.opponent}
                    name={opponentName(game.opponent)}
                    size={32}
                    league={league}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-200">
                      {game.home ? "vs" : "à"} {opponentName(game.opponent)}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {formatDayLabel(game.startTimeUTC)} ·{" "}
                      {game.home ? "Domicile" : "Extérieur"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-bold tabular-nums text-neutral-50">
                      {game.teamScore}-{game.opponentScore}
                    </p>
                    <p className={`text-[11px] ${style.text}`}>
                      {resultLabel(game)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        <p className="text-center">
          <Link href="/matches" className="text-sm text-sky-400">
            Retour aux matchs
          </Link>
        </p>
      </div>
    </div>
  );
}
