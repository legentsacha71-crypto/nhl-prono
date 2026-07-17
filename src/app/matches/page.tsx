import { getUpcomingGames, type NhlGame } from "@/lib/nhl";
import { getTeamStats, getLeagueAverageGoals, type TeamStats } from "@/lib/nhlStats";
import { estimateWinPoints } from "@/lib/scoring";
import { TEAM_TIMEZONES } from "@/lib/nhlTeams";
import { createClient } from "@/utils/supabase/server";
import { toggleBoost } from "./actions";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import TeamBadge from "@/components/TeamBadge";
import SubmitButton from "@/components/SubmitButton";
import PredictionForm from "./PredictionForm";

function formatDayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "Europe/Paris",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Paris",
  });
}

function formatLocalTime(iso: string, homeAbbrev: string): string | null {
  const timeZone = TEAM_TIMEZONES[homeAbbrev];
  if (!timeZone) return null;
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  });
}

function getWinPointsPreview(
  game: NhlGame,
  teamStats: Map<string, TeamStats>,
  leagueAvgGoals: number,
) {
  const home = teamStats.get(game.homeTeam.abbrev);
  const away = teamStats.get(game.awayTeam.abbrev);
  if (!home || !away || !Number.isFinite(leagueAvgGoals)) return null;

  const preview = estimateWinPoints(home, away, leagueAvgGoals);
  if (!Number.isFinite(preview.homePoints) || !Number.isFinite(preview.awayPoints)) {
    return null;
  }
  return preview;
}

function groupByDay(games: NhlGame[]) {
  const groups = new Map<string, { label: string; games: NhlGame[] }>();
  for (const game of games) {
    const dayKey = new Date(game.startTimeUTC).toDateString();
    if (!groups.has(dayKey)) {
      groups.set(dayKey, {
        label: formatDayLabel(game.startTimeUTC),
        games: [],
      });
    }
    groups.get(dayKey)!.games.push(game);
  }
  return [...groups.values()];
}

export default async function MatchesPage() {
  // getUpcomingGames() et getTeamStats() n'ont pas de dépendance l'une envers
  // l'autre : on les lance en parallèle plutôt qu'en série.
  const [games, teamStats] = await Promise.all([
    getUpcomingGames(),
    getTeamStats(),
  ]);
  const leagueAvgGoals = getLeagueAverageGoals(teamStats);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const gameIds = games.map((g) => g.id);
  // Les pronostics et le statut premium dépendent tous les deux de
  // l'utilisateur mais pas l'un de l'autre : on les lance en parallèle.
  const [{ data: predictions }, { data: profile }] = await Promise.all([
    gameIds.length > 0 && user
      ? supabase
          .from("predictions")
          .select("game_id, away_score, home_score, boosted")
          .eq("user_id", user.id)
          .in("game_id", gameIds)
      : Promise.resolve({ data: [] }),
    user
      ? supabase.from("profiles").select("is_premium").eq("id", user.id).single()
      : Promise.resolve({ data: null }),
  ]);

  const predictionByGameId = new Map(
    (predictions ?? []).map((p) => [p.game_id, p]),
  );

  const isPremium = profile?.is_premium ?? false;

  const dayGroups = groupByDay(games);

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-center text-sky-400">
          Matchs à venir
        </h1>

        {games.length === 0 && (
          <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
            Pas de matchs à venir pour le moment. La saison NHL reprend en
            octobre.
          </p>
        )}

        {dayGroups.map((group) => (
          <div key={group.label} className="space-y-3">
            <h2 className="text-sm font-medium text-neutral-400">
              {group.label}
            </h2>
            <ul className="space-y-3">
              {group.games.map((game) => {
                const localTime = formatLocalTime(
                  game.startTimeUTC,
                  game.homeTeam.abbrev,
                );
                const frenchTime = formatTime(game.startTimeUTC);
                const winPoints = getWinPointsPreview(
                  game,
                  teamStats,
                  leagueAvgGoals,
                );

                return (
                <li
                  key={game.id}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm"
                >
                  <p className="mb-2 text-center text-xs text-neutral-500">
                    {frenchTime}
                    {localTime && localTime !== frenchTime && (
                      <span className="text-neutral-600">
                        {" "}
                        · {localTime} heure locale
                      </span>
                    )}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex flex-1 flex-col items-center gap-1">
                      <TeamBadge
                        abbrev={game.awayTeam.abbrev}
                        name={game.awayTeam.name}
                        size={40}
                      />
                      <span className="text-sm text-neutral-200">
                        {game.awayTeam.name}
                      </span>
                    </div>
                    <span className="px-2 text-sm text-neutral-600">@</span>
                    <div className="flex flex-1 flex-col items-center gap-1">
                      <TeamBadge
                        abbrev={game.homeTeam.abbrev}
                        name={game.homeTeam.name}
                        size={40}
                      />
                      <span className="text-sm text-neutral-200">
                        {game.homeTeam.name}
                      </span>
                    </div>
                  </div>

                  {winPoints && (
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px]">
                      <span
                        className="rounded-full bg-neutral-800 px-2 py-0.5 text-neutral-400"
                        title={`Probabilité de victoire ${game.awayTeam.abbrev} : ${Math.round(winPoints.awayWinProbability * 100)}%`}
                      >
                        {game.awayTeam.abbrev}{" "}
                        <span className="font-medium text-emerald-400">
                          {winPoints.awayPoints} pts
                        </span>
                      </span>
                      <span
                        className="rounded-full bg-neutral-800 px-2 py-0.5 text-neutral-500"
                        title={`Probabilité de match nul à la fin du temps réglementaire : ${Math.round(winPoints.drawProbability * 100)}%`}
                      >
                        Nul{" "}
                        <span className="font-medium text-emerald-400">
                          {winPoints.drawPoints} pts
                        </span>
                      </span>
                      <span
                        className="rounded-full bg-neutral-800 px-2 py-0.5 text-neutral-400"
                        title={`Probabilité de victoire ${game.homeTeam.abbrev} : ${Math.round(winPoints.homeWinProbability * 100)}%`}
                      >
                        {game.homeTeam.abbrev}{" "}
                        <span className="font-medium text-emerald-400">
                          {winPoints.homePoints} pts
                        </span>
                      </span>
                    </div>
                  )}

                  <PredictionForm
                    gameId={game.id}
                    startTimeUTC={game.startTimeUTC}
                    awayAbbrev={game.awayTeam.abbrev}
                    homeAbbrev={game.homeTeam.abbrev}
                    initialAwayScore={predictionByGameId.get(game.id)?.away_score}
                    initialHomeScore={predictionByGameId.get(game.id)?.home_score}
                  />

                  {predictionByGameId.has(game.id) &&
                    (isPremium ? (
                      <form
                        action={toggleBoost}
                        className="mt-2 flex justify-center"
                      >
                        <input type="hidden" name="gameId" value={game.id} />
                        <input
                          type="hidden"
                          name="startTimeUTC"
                          value={game.startTimeUTC}
                        />
                        <SubmitButton
                          className={
                            predictionByGameId.get(game.id)?.boosted
                              ? "rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-neutral-950"
                              : "rounded-md border border-amber-500/40 px-3 py-1 text-xs font-medium text-amber-400 hover:bg-amber-500/10"
                          }
                        >
                          {predictionByGameId.get(game.id)?.boosted
                            ? "🔥 Boosté x2 — retirer"
                            : "Booster x2"}
                        </SubmitButton>
                      </form>
                    ) : (
                      <p className="mt-2 text-center text-[11px] text-neutral-600">
                        🔒 Boost x2 réservé aux membres Premium
                      </p>
                    ))}
                </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
