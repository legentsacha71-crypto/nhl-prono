import { createClient } from "@/utils/supabase/server";
import { getRanking } from "@/lib/ranking";
import { getGameResult } from "@/lib/nhlResults";
import { getStanleyCupOdds, type StanleyCupOdds } from "@/lib/oddsApi";
import { NHL_TEAMS, getTeamName, getTeamLogo } from "@/lib/nhlTeams";
import { updateFavoriteTeam, submitStanleyCupPick } from "./actions";
import BottomNav from "@/components/BottomNav";

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen p-6 pb-24">
        <p className="text-center text-neutral-400">
          Connecte-toi pour voir ton profil.
        </p>
        <BottomNav />
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, favorite_team")
    .eq("id", user.id)
    .single();

  const username = profile?.username ?? user.email ?? "Joueur";
  const favoriteTeam = profile?.favorite_team as string | null | undefined;

  const { data: predictions } = await supabase
    .from("predictions")
    .select("game_id, away_score, home_score, points, is_exact_score, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const all = predictions ?? [];
  const graded = all.filter((p) => p.points !== null);
  const totalPoints = graded.reduce((sum, p) => sum + (p.points ?? 0), 0);
  const exactScoreCount = graded.filter((p) => p.is_exact_score).length;

  const ranking = await getRanking(supabase);
  const rank = ranking.findIndex((entry) => entry.userId === user.id) + 1;

  const { data: season } = await supabase
    .from("stanley_cup_season")
    .select("lock_at, winner_team")
    .eq("id", 1)
    .single();

  const { data: myPick } = await supabase
    .from("stanley_cup_picks")
    .select("team_abbrev, odds_price, points")
    .eq("user_id", user.id)
    .maybeSingle();

  const isLocked = !season || new Date(season.lock_at) <= new Date();

  let stanleyCupOdds: StanleyCupOdds[] = [];
  if (season && !isLocked) {
    try {
      stanleyCupOdds = await getStanleyCupOdds();
    } catch {
      stanleyCupOdds = [];
    }
  }

  const recent = all.slice(0, 8);
  const results = await Promise.all(
    recent.map(async (p) => {
      try {
        const result = await getGameResult(p.game_id);
        return { prediction: p, result };
      } catch {
        return { prediction: p, result: null };
      }
    }),
  );

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold text-sky-400">{username}</h1>

          <div className="flex h-24 w-24 items-center justify-center rounded-full border border-neutral-700 bg-neutral-900 text-3xl font-bold text-neutral-400">
            {username.slice(0, 1).toUpperCase()}
          </div>

          {favoriteTeam && (
            <div className="flex items-center gap-2">
              <img
                src={getTeamLogo(favoriteTeam)}
                alt={favoriteTeam}
                className="h-8 w-8"
              />
              <span className="text-sm text-neutral-300">
                {getTeamName(favoriteTeam)}
              </span>
            </div>
          )}

          <form action={updateFavoriteTeam} className="flex items-center gap-2">
            <select
              name="favoriteTeam"
              defaultValue={favoriteTeam ?? ""}
              className="rounded-md border border-neutral-700 bg-neutral-900 p-1 text-xs text-neutral-100"
            >
              <option value="">Équipe favorite…</option>
              {NHL_TEAMS.map((team) => (
                <option key={team.abbrev} value={team.abbrev}>
                  {team.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white"
            >
              OK
            </button>
          </form>
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
            <p className="text-lg font-bold text-sky-400">{all.length}</p>
            <p className="text-xs text-neutral-500">Pronos</p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
            <p className="text-lg font-bold text-sky-400">{totalPoints}</p>
            <p className="text-xs text-neutral-500">Points</p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3">
            <p className="text-lg font-bold text-sky-400">{exactScoreCount}</p>
            <p className="text-xs text-neutral-500">Score exact</p>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center">
          <p className="text-sm text-neutral-400">Classement général</p>
          <p className="text-lg font-medium text-neutral-100">
            {rank > 0 ? `#${rank} sur ${ranking.length}` : "Pas encore classé"}
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-medium text-neutral-200">Mes pronos récents</h2>
          {recent.length === 0 ? (
            <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
              Aucun prono pour le moment.
            </p>
          ) : (
            <ul className="space-y-2">
              {results.map(({ prediction, result }) => (
                <li
                  key={prediction.game_id}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm"
                >
                  <span className="text-neutral-300">
                    {result
                      ? `${result.awayAbbrev} @ ${result.homeAbbrev}`
                      : `Match #${prediction.game_id}`}
                    <span className="ml-2 text-neutral-500">
                      (prono {prediction.away_score}-{prediction.home_score})
                    </span>
                  </span>
                  <span className="font-medium text-sky-400">
                    {prediction.points !== null
                      ? `${prediction.points} pts`
                      : "en attente"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="mb-2 font-medium text-neutral-200">Mes amis</h2>
          <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
            Bientôt disponible.
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="font-medium text-neutral-200">Mes favoris</h2>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <p className="mb-2 text-sm font-medium text-neutral-300">
              Vainqueur de la coupe Stanley
            </p>

            {!season ? (
              <p className="text-sm text-neutral-500">
                Pas encore configuré pour cette saison.
              </p>
            ) : season.winner_team ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-300">
                  {myPick
                    ? `Ton pick : ${getTeamName(myPick.team_abbrev)}`
                    : "Tu n'avais pas fait de pick."}
                </span>
                <span className="font-medium text-sky-400">
                  {myPick?.points ?? 0} pts
                </span>
              </div>
            ) : isLocked ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-300">
                  {myPick
                    ? `Ton pick (verrouillé) : ${getTeamName(myPick.team_abbrev)}`
                    : "Verrouillé, tu n'as pas fait de pick."}
                </span>
                <span className="text-neutral-500">En attente du résultat</span>
              </div>
            ) : (
              <form
                action={submitStanleyCupPick}
                className="flex items-center gap-2"
              >
                <select
                  name="teamAbbrev"
                  defaultValue={myPick?.team_abbrev ?? ""}
                  className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-100"
                >
                  <option value="">Choisir une équipe…</option>
                  {stanleyCupOdds.map((o) => (
                    <option key={o.abbrev} value={o.abbrev}>
                      {o.name} (cote {o.price.toFixed(2)})
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white"
                >
                  {myPick ? "Modifier" : "Valider"}
                </button>
              </form>
            )}
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4">
            <p className="mb-1 text-sm font-medium text-neutral-300">
              Meilleur buteur de la saison
            </p>
            <p className="text-sm text-neutral-500">Bientôt disponible.</p>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
