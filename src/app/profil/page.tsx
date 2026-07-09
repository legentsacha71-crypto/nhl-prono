import { createClient } from "@/utils/supabase/server";
import { getRanking } from "@/lib/ranking";
import { getGameResult } from "@/lib/nhlResults";
import { getStanleyCupOdds, type StanleyCupOdds } from "@/lib/oddsApi";
import { getTeamName } from "@/lib/nhlTeams";
import { TOP_SCORER_CANDIDATES, getTopScorerPoints } from "@/lib/nhlScorers";
import {
  updateFavoriteTeam,
  submitStanleyCupPick,
  uploadAvatar,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  submitTopScorerPick,
} from "./actions";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import FavoriteTeamPicker from "@/components/FavoriteTeamPicker";
import StanleyCupPicker from "@/components/StanleyCupPicker";
import TopScorerPicker from "@/components/TopScorerPicker";

function formatLockCountdown(lockAt: string): string {
  const diffMs = new Date(lockAt).getTime() - Date.now();
  const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const dateLabel = new Date(lockAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
  });
  return `${days} jour${days > 1 ? "s" : ""} (${dateLabel})`;
}

export default async function ProfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen p-6 pt-20 pb-24">
        <TopBar />
        <p className="text-center text-neutral-400">
          Connecte-toi pour voir ton profil.
        </p>
        <BottomNav />
      </div>
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username, favorite_team, avatar_url")
    .eq("id", user.id)
    .single();

  const username = profile?.username ?? user.email ?? "Joueur";
  const favoriteTeam = profile?.favorite_team as string | null | undefined;
  const avatarUrl = profile?.avatar_url as string | null | undefined;

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
  let stanleyCupOddsError: string | null = null;
  if (season && !isLocked) {
    try {
      stanleyCupOdds = await getStanleyCupOdds();
      if (stanleyCupOdds.length === 0) {
        stanleyCupOddsError =
          "Aucune cote disponible pour l'instant : notre fournisseur de cotes n'active le suivi de la NHL qu'à l'approche de la saison. Reviens un peu plus près de la reprise.";
      }
    } catch (err) {
      stanleyCupOddsError =
        err instanceof Error ? err.message : "Erreur lors de la récupération des cotes.";
    }
  }

  const { data: topScorerSeason } = await supabase
    .from("top_scorer_season")
    .select("lock_at, winner_player")
    .eq("id", 1)
    .single();

  const { data: myTopScorerPick } = await supabase
    .from("top_scorer_picks")
    .select("player_name, points")
    .eq("user_id", user.id)
    .maybeSingle();

  const isTopScorerLocked =
    !topScorerSeason || new Date(topScorerSeason.lock_at) <= new Date();

  const lockEntries: { label: string; lockAt: string }[] = [];
  if (season && !season.winner_team && !isLocked) {
    lockEntries.push({ label: "Coupe Stanley", lockAt: season.lock_at });
  }
  if (topScorerSeason && !topScorerSeason.winner_player && !isTopScorerLocked) {
    lockEntries.push({
      label: "Meilleur buteur",
      lockAt: topScorerSeason.lock_at,
    });
  }
  const lockGroups = new Map<string, string[]>();
  for (const entry of lockEntries) {
    const labels = lockGroups.get(entry.lockAt) ?? [];
    labels.push(entry.label);
    lockGroups.set(entry.lockAt, labels);
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

  const { data: friendshipRows } = await supabase
    .from("friendships")
    .select(
      "id, status, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(username), addressee:profiles!friendships_addressee_id_fkey(username)",
    )
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

  type FriendshipRow = {
    id: string;
    status: string;
    requester_id: string;
    addressee_id: string;
    requester: { username: string } | null;
    addressee: { username: string } | null;
  };
  const friendshipRowsTyped = (friendshipRows ??
    []) as unknown as FriendshipRow[];

  const pointsByUserId = new Map(
    ranking.map((entry) => [entry.userId, entry.totalPoints]),
  );

  const friends = friendshipRowsTyped
    .filter((f) => f.status === "accepted")
    .map((f) => {
      const isRequester = f.requester_id === user.id;
      const friendId = isRequester ? f.addressee_id : f.requester_id;
      const friendUsername = isRequester
        ? f.addressee?.username
        : f.requester?.username;
      return {
        friendshipId: f.id,
        username: friendUsername ?? "Joueur",
        points: pointsByUserId.get(friendId) ?? 0,
      };
    });

  const incomingRequests = friendshipRowsTyped.filter(
    (f) => f.status === "pending" && f.addressee_id === user.id,
  );
  const outgoingRequests = friendshipRowsTyped.filter(
    (f) => f.status === "pending" && f.requester_id === user.id,
  );

  return (
    <div className="min-h-screen p-6 pt-20 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-2xl font-bold text-sky-400">{username}</h1>

          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={username}
              className="h-24 w-24 rounded-full border border-neutral-700 object-cover shadow-lg shadow-black/30 ring-2 ring-neutral-800 transition-transform duration-200 hover:scale-105"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-neutral-700 bg-gradient-to-br from-neutral-800 to-neutral-900 text-3xl font-bold text-neutral-400 shadow-lg shadow-black/30 ring-2 ring-neutral-800 transition-transform duration-200 hover:scale-105">
              {username.slice(0, 1).toUpperCase()}
            </div>
          )}

          <form action={uploadAvatar} className="flex items-center gap-2">
            <input
              type="file"
              name="avatar"
              accept="image/png,image/jpeg,image/webp"
              required
              className="text-xs text-neutral-400 file:mr-2 file:rounded-md file:border-0 file:bg-neutral-800 file:px-2 file:py-1 file:text-xs file:text-neutral-200 file:transition-colors file:duration-150 hover:file:bg-neutral-700"
            />
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white shadow-sm shadow-sky-950/40 transition-colors duration-150 hover:bg-sky-500"
            >
              Changer
            </button>
          </form>

          <FavoriteTeamPicker
            favoriteTeam={favoriteTeam}
            updateFavoriteTeam={updateFavoriteTeam}
          />
        </div>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-md shadow-black/20 transition-transform duration-200 hover:-translate-y-0.5">
            <p className="text-lg font-bold text-sky-400">{all.length}</p>
            <p className="text-xs text-neutral-500">Pronos</p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-md shadow-black/20 transition-transform duration-200 hover:-translate-y-0.5">
            <p className="text-lg font-bold text-sky-400">{totalPoints}</p>
            <p className="text-xs text-neutral-500">Points</p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-md shadow-black/20 transition-transform duration-200 hover:-translate-y-0.5">
            <p className="text-lg font-bold text-sky-400">{exactScoreCount}</p>
            <p className="text-xs text-neutral-500">
              {exactScoreCount > 1 ? "Scores exacts" : "Score exact"}
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-neutral-800 bg-gradient-to-r from-sky-500/10 to-neutral-900 p-4 text-center shadow-lg shadow-black/20">
          <p className="text-sm text-neutral-400">🏆 Classement général</p>
          <p className="text-lg font-medium text-neutral-100">
            {rank > 0 ? `#${rank} sur ${ranking.length}` : "Pas encore classé"}
          </p>
        </div>

        <div>
          <h2 className="mb-2 font-medium text-neutral-200">
            🏒 Mes pronos récents
          </h2>
          {recent.length === 0 ? (
            <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
              Aucun prono pour le moment.
            </p>
          ) : (
            <ul className="space-y-2">
              {results.map(({ prediction, result }) => (
                <li
                  key={prediction.game_id}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm shadow-sm shadow-black/20 transition-colors duration-150 hover:bg-neutral-800/50"
                >
                  <span className="text-neutral-300">
                    {result
                      ? `${result.awayAbbrev} @ ${result.homeAbbrev}`
                      : `Match #${prediction.game_id}`}
                    <span className="ml-2 text-neutral-500">
                      (prono {prediction.away_score}-{prediction.home_score})
                    </span>
                  </span>
                  <span
                    className={`font-medium ${
                      prediction.points === null
                        ? "text-neutral-500"
                        : prediction.points > 0
                          ? "text-emerald-400"
                          : "text-neutral-600"
                    }`}
                  >
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
          <h2 className="mb-2 font-medium text-neutral-200">👥 Mes amis</h2>

          <form
            action={sendFriendRequest}
            className="mb-3 flex items-center gap-2"
          >
            <input
              name="username"
              type="text"
              placeholder="Pseudo de ton ami"
              required
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
            />
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-sky-950/40 transition-colors duration-150 hover:bg-sky-500"
            >
              Ajouter
            </button>
          </form>

          {incomingRequests.length > 0 && (
            <div className="mb-3 space-y-2">
              {incomingRequests.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-lg border border-sky-800 bg-sky-950 p-3 text-sm shadow-md shadow-sky-950/30"
                >
                  <span className="text-sky-100">
                    {r.requester?.username ?? "?"} veut être ton ami
                  </span>
                  <div className="flex gap-2">
                    <form action={respondToFriendRequest}>
                      <input type="hidden" name="friendshipId" value={r.id} />
                      <input type="hidden" name="action" value="accept" />
                      <button
                        type="submit"
                        className="rounded-md bg-sky-600 px-2 py-1 text-xs font-medium text-white transition-colors duration-150 hover:bg-sky-500"
                      >
                        Accepter
                      </button>
                    </form>
                    <form action={respondToFriendRequest}>
                      <input type="hidden" name="friendshipId" value={r.id} />
                      <input type="hidden" name="action" value="decline" />
                      <button
                        type="submit"
                        className="rounded-md border border-neutral-700 px-2 py-1 text-xs text-neutral-300 transition-colors duration-150 hover:border-neutral-600 hover:bg-neutral-900"
                      >
                        Refuser
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}

          {friends.length === 0 ? (
            <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
              Aucun ami pour le moment.
            </p>
          ) : (
            <ul className="space-y-2">
              {friends.map((f) => (
                <li
                  key={f.friendshipId}
                  className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm shadow-sm shadow-black/20 transition-colors duration-150 hover:bg-neutral-800/50"
                >
                  <span className="text-neutral-200">{f.username}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-sky-400">
                      {f.points} pts
                    </span>
                    <form action={removeFriend}>
                      <input
                        type="hidden"
                        name="friendshipId"
                        value={f.friendshipId}
                      />
                      <button
                        type="submit"
                        className="text-xs text-neutral-500 transition-colors duration-150 hover:text-red-400"
                      >
                        Retirer
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {outgoingRequests.length > 0 && (
            <p className="mt-2 text-xs text-neutral-500">
              En attente :{" "}
              {outgoingRequests
                .map((r) => r.addressee?.username)
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h2 className="font-medium text-neutral-200">⭐ Mes favoris</h2>
            {lockGroups.size > 0 && (
              <div className="text-right text-xs text-neutral-500">
                {[...lockGroups.entries()].map(([lockAt, labels]) => (
                  <p key={lockAt}>
                    🔒 {labels.join(" & ")} : {formatLockCountdown(lockAt)}
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-lg shadow-black/20">
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
            ) : stanleyCupOddsError ? (
              <p className="text-sm text-amber-500">{stanleyCupOddsError}</p>
            ) : (
              <StanleyCupPicker
                options={stanleyCupOdds.map((o) => ({
                  abbrev: o.abbrev,
                  label: `${o.name} (cote ${o.price.toFixed(2)})`,
                }))}
                initialTeam={myPick?.team_abbrev ?? null}
                submitPick={submitStanleyCupPick}
              />
            )}
          </div>

          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-lg shadow-black/20">
            <p className="mb-2 text-sm font-medium text-neutral-300">
              Meilleur buteur de la saison
            </p>

            {!topScorerSeason ? (
              <p className="text-sm text-neutral-500">
                Pas encore configuré pour cette saison.
              </p>
            ) : topScorerSeason.winner_player ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-300">
                  {myTopScorerPick
                    ? `Ton pick : ${myTopScorerPick.player_name}`
                    : "Tu n'avais pas fait de pick."}
                </span>
                <span className="font-medium text-sky-400">
                  {myTopScorerPick?.points ?? 0} pts
                </span>
              </div>
            ) : isTopScorerLocked ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-300">
                  {myTopScorerPick
                    ? `Ton pick (verrouillé) : ${myTopScorerPick.player_name}`
                    : "Verrouillé, tu n'as pas fait de pick."}
                </span>
                <span className="text-neutral-500">
                  {myTopScorerPick
                    ? `${getTopScorerPoints(myTopScorerPick.player_name) ?? 0} pts si bon`
                    : "En attente du résultat"}
                </span>
              </div>
            ) : (
              <TopScorerPicker
                players={TOP_SCORER_CANDIDATES}
                initialPlayer={myTopScorerPick?.player_name ?? null}
                submitPick={submitTopScorerPick}
              />
            )}
            {topScorerSeason && !topScorerSeason.winner_player && (
              <p className="mt-2 text-xs text-neutral-500">
                Les points varient selon le joueur choisi : plus il est
                outsider, plus tu gagnes de points s&apos;il devient meilleur
                buteur.
              </p>
            )}
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
