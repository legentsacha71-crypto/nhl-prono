import { getUpcomingGames, type NhlGame } from "@/lib/nhl";
import { createClient } from "@/utils/supabase/server";
import { submitPrediction, toggleBoost } from "./actions";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import TeamBadge from "@/components/TeamBadge";
import SubmitButton from "@/components/SubmitButton";

function formatDayLabel(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    weekday: "short",
    day: "2-digit",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
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
  const games = await getUpcomingGames();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const gameIds = games.map((g) => g.id);
  const { data: predictions } =
    gameIds.length > 0 && user
      ? await supabase
          .from("predictions")
          .select("game_id, away_score, home_score, boosted")
          .eq("user_id", user.id)
          .in("game_id", gameIds)
      : { data: [] };

  const predictionByGameId = new Map(
    (predictions ?? []).map((p) => [p.game_id, p]),
  );

  let isPremium = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_premium")
      .eq("id", user.id)
      .single();
    isPremium = profile?.is_premium ?? false;
  }

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
              {group.games.map((game) => (
                <li
                  key={game.id}
                  className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-sm"
                >
                  <p className="mb-2 text-center text-xs text-neutral-500">
                    {formatTime(game.startTimeUTC)}
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

                  <form
                    action={submitPrediction}
                    className="mt-3 flex items-end justify-center gap-3"
                  >
                    <input type="hidden" name="gameId" value={game.id} />
                    <input
                      type="hidden"
                      name="startTimeUTC"
                      value={game.startTimeUTC}
                    />
                    <div className="flex flex-col items-center">
                      <label
                        htmlFor={`away-${game.id}`}
                        className="text-xs text-neutral-500"
                      >
                        {game.awayTeam.abbrev}
                      </label>
                      <input
                        id={`away-${game.id}`}
                        name="awayScore"
                        type="number"
                        min={0}
                        required
                        defaultValue={predictionByGameId.get(game.id)?.away_score}
                        className="w-16 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-center text-neutral-100"
                      />
                    </div>
                    <span className="pb-2 text-sm text-neutral-600">-</span>
                    <div className="flex flex-col items-center">
                      <label
                        htmlFor={`home-${game.id}`}
                        className="text-xs text-neutral-500"
                      >
                        {game.homeTeam.abbrev}
                      </label>
                      <input
                        id={`home-${game.id}`}
                        name="homeScore"
                        type="number"
                        min={0}
                        required
                        defaultValue={predictionByGameId.get(game.id)?.home_score}
                        className="w-16 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-center text-neutral-100"
                      />
                    </div>
                    <SubmitButton className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white">
                      {predictionByGameId.has(game.id) ? "Modifier" : "Valider"}
                    </SubmitButton>
                  </form>

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
              ))}
            </ul>
          </div>
        ))}
      </div>

      <BottomNav />
    </div>
  );
}
