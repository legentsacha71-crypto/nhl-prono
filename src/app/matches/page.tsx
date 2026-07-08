import { getUpcomingGames } from "@/lib/nhl";
import { createClient } from "@/utils/supabase/server";
import { submitPrediction } from "./actions";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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
          .select("game_id, away_score, home_score")
          .eq("user_id", user.id)
          .in("game_id", gameIds)
      : { data: [] };

  const predictionByGameId = new Map(
    (predictions ?? []).map((p) => [p.game_id, p]),
  );

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-center">Matchs à venir</h1>

        {games.length === 0 && (
          <p className="rounded-md bg-gray-100 p-4 text-center text-sm text-gray-600">
            Pas de matchs à venir pour le moment. La saison NHL reprend en
            octobre.
          </p>
        )}

        <ul className="space-y-3">
          {games.map((game) => (
            <li
              key={game.id}
              className="rounded-md border border-gray-200 p-4"
            >
              <p className="mb-2 text-center text-xs text-gray-500">
                {formatDateTime(game.startTimeUTC)}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex flex-1 flex-col items-center gap-1">
                  <img
                    src={game.awayTeam.logo}
                    alt={game.awayTeam.name}
                    className="h-10 w-10"
                  />
                  <span className="text-sm">{game.awayTeam.name}</span>
                </div>
                <span className="px-2 text-sm text-gray-400">@</span>
                <div className="flex flex-1 flex-col items-center gap-1">
                  <img
                    src={game.homeTeam.logo}
                    alt={game.homeTeam.name}
                    className="h-10 w-10"
                  />
                  <span className="text-sm">{game.homeTeam.name}</span>
                </div>
              </div>

              <form action={submitPrediction} className="mt-3 flex items-end justify-center gap-3">
                <input type="hidden" name="gameId" value={game.id} />
                <input
                  type="hidden"
                  name="startTimeUTC"
                  value={game.startTimeUTC}
                />
                <div className="flex flex-col items-center">
                  <label
                    htmlFor={`away-${game.id}`}
                    className="text-xs text-gray-500"
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
                    className="w-16 rounded-md border border-gray-300 p-2 text-center"
                  />
                </div>
                <span className="pb-2 text-sm text-gray-400">-</span>
                <div className="flex flex-col items-center">
                  <label
                    htmlFor={`home-${game.id}`}
                    className="text-xs text-gray-500"
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
                    className="w-16 rounded-md border border-gray-300 p-2 text-center"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white"
                >
                  {predictionByGameId.has(game.id) ? "Modifier" : "Valider"}
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
