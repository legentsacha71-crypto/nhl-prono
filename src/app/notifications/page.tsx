import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";
import { respondToFriendRequest } from "@/app/profil/actions";
import TopBar from "@/components/TopBar";
import FriendRequestActions from "@/components/FriendRequestActions";
import {
  ActivityRow,
  NightRecap,
  PendingList,
  ResultCard,
  SectionLabel,
} from "@/components/NotificationFeed";
import { getGameResult } from "@/lib/gameResults";
import { isMagnusGameId } from "@/lib/competition";
import { getUpcomingGames as getNhlUpcomingGames } from "@/lib/nhl";
import { getUpcomingGames as getMagnusUpcomingGames } from "@/lib/magnus";
import { getRanking } from "@/lib/ranking";
import { isLive, type Game } from "@/lib/gameDates";
import {
  matchupKey,
  nightKey,
  nightLabel,
  pointsNotificationKey,
  toActivityItem,
  type League,
  type PendingItem,
  type ResultItem,
} from "@/lib/notificationFeed";

// Nombre de cartes de résultat affichées (une requête de score par match,
// en cache une fois le match noté) et de pronos à venir listés.
const RESULT_CARDS = 15;
const PENDING_ROWS = 6;
// Pronos terminés mais pas encore notés : leur score est relu en direct.
const AWAITING_LOOKUPS = 6;
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

type PredictionRow = {
  game_id: number;
  away_score: number;
  home_score: number;
  points: number | null;
  base_points: number | null;
  bonus_points: number | null;
  is_exact_score: boolean | null;
  boosted: boolean | null;
  game_start_time: string | null;
};

const PREDICTION_COLUMNS =
  "game_id, away_score, home_score, points, base_points, bonus_points, is_exact_score, boosted, game_start_time";

function leagueOf(gameId: number): League {
  return isMagnusGameId(gameId) ? "magnus" : "nhl";
}

async function toResultItem(
  p: PredictionRow,
  newMatchups: Set<string>,
): Promise<ResultItem | null> {
  try {
    // Pronostic déjà noté : match terminé, score lisible en cache.
    const result = await getGameResult(p.game_id, { settled: true });
    if (!result.homeAbbrev || !result.awayAbbrev) return null;
    return {
      gameId: p.game_id,
      league: leagueOf(p.game_id),
      homeAbbrev: result.homeAbbrev,
      awayAbbrev: result.awayAbbrev,
      homeScore: result.regulationHomeScore,
      awayScore: result.regulationAwayScore,
      predictedHome: p.home_score,
      predictedAway: p.away_score,
      points: p.points ?? 0,
      basePoints: p.base_points,
      bonusPoints: p.bonus_points,
      isExactScore: Boolean(p.is_exact_score),
      boosted: Boolean(p.boosted),
      isNew: newMatchups.has(matchupKey(result.homeAbbrev, result.awayAbbrev)),
    };
  } catch {
    return null;
  }
}

function pendingFromGame(p: PredictionRow, game: Game, league: League): PendingItem {
  const live = isLive(game);
  return {
    gameId: p.game_id,
    league,
    homeAbbrev: game.homeTeam.abbrev,
    awayAbbrev: game.awayTeam.abbrev,
    predictedHome: p.home_score,
    predictedAway: p.away_score,
    startTime: game.startTimeUTC,
    status: live ? "live" : "upcoming",
    homeScore: live && !game.scoreUnavailable ? (game.homeTeam.score ?? null) : null,
    awayScore: live && !game.scoreUnavailable ? (game.awayTeam.score ?? null) : null,
  };
}

// Match commencé qui n'est plus dans la liste des matchs à venir : terminé
// (en attente de notation) ou pas encore marqué comme commencé par l'API.
async function pendingFromResult(p: PredictionRow): Promise<PendingItem | null> {
  try {
    const result = await getGameResult(p.game_id);
    if (!result.homeAbbrev || !result.awayAbbrev) return null;
    return {
      gameId: p.game_id,
      league: leagueOf(p.game_id),
      homeAbbrev: result.homeAbbrev,
      awayAbbrev: result.awayAbbrev,
      predictedHome: p.home_score,
      predictedAway: p.away_score,
      startTime: p.game_start_time ?? new Date().toISOString(),
      status: result.isFinal ? "awaiting" : "live",
      homeScore: result.isFinal ? result.regulationHomeScore : null,
      awayScore: result.isFinal ? result.regulationAwayScore : null,
    };
  } catch {
    return null;
  }
}

const STATUS_ORDER = { live: 0, awaiting: 1, upcoming: 2 } as const;

export default async function NotificationsPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const now = new Date();

  const [
    { data: notifications },
    { data: friendRequestRows },
    { data: gradedRows },
    { data: pendingRows },
    ranking,
    nhlGames,
    magnusGames,
  ] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, message, created_at, read_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
    // Demandes d'ami en attente : carte Accepter/Refuser, en plus de la page
    // profil (voir FriendRequestActions).
    supabase
      .from("friendships")
      .select("id, requester:profiles!friendships_requester_id_fkey(username)")
      .eq("addressee_id", user.id)
      .eq("status", "pending"),
    // Assez de lignes pour couvrir toute la dernière nuit dans le récap,
    // même si seules les RESULT_CARDS premières ont leur carte.
    supabase
      .from("predictions")
      .select(PREDICTION_COLUMNS)
      .eq("user_id", user.id)
      .not("points", "is", null)
      .order("game_start_time", { ascending: false })
      .limit(40),
    supabase
      .from("predictions")
      .select(PREDICTION_COLUMNS)
      .eq("user_id", user.id)
      .is("points", null)
      .order("game_start_time", { ascending: true }),
    getRanking(supabase).catch(() => []),
    getNhlUpcomingGames().catch((): Game[] => []),
    getMagnusUpcomingGames().catch((): Game[] => []),
  ]);

  await supabase
    .from("notifications")
    .update({ read_at: now.toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  const allNotifications = notifications ?? [];
  const unreadCount = allNotifications.filter((n) => !n.read_at).length;

  // Les notifications de points sont remplacées par les cartes de résultat :
  // on ne garde que les matchs à marquer "Nouveau".
  const newMatchups = new Set<string>();
  const activityNotifications: typeof allNotifications = [];
  for (const n of allNotifications) {
    const key = pointsNotificationKey(n.message);
    if (key === null) activityNotifications.push(n);
    else if (!n.read_at) newMatchups.add(key);
  }

  type FriendRequestRow = { id: string; requester: { username: string } | null };
  const friendRequests = (friendRequestRows ?? []) as unknown as FriendRequestRow[];
  const pendingRequesters = new Set(friendRequests.map((r) => r.requester?.username));

  // Une demande d'ami encore en attente a déjà sa carte Accepter/Refuser.
  const activity = activityNotifications
    .map(toActivityItem)
    .filter((a) => !(a.kind === "friend-request" && pendingRequesters.has(a.name ?? undefined)))
    .slice(0, 15);

  // Récap de la dernière nuit jouée.
  const graded = (gradedRows ?? []) as PredictionRow[];
  const lastNight = graded[0] ? nightKey(graded[0].game_start_time) : null;
  const nightPredictions = graded.filter((p) => nightKey(p.game_start_time) === lastNight);
  const rank = ranking.findIndex((entry) => entry.userId === user.id) + 1;

  const results = (
    await Promise.all(graded.slice(0, RESULT_CARDS).map((p) => toResultItem(p, newMatchups)))
  ).filter((item): item is ResultItem => item !== null);

  const resultGroups: { key: string; label: string; items: ResultItem[] }[] = [];
  for (const item of results) {
    const start = graded.find((p) => p.game_id === item.gameId)?.game_start_time ?? null;
    const key = nightKey(start);
    const last = resultGroups[resultGroups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else resultGroups.push({ key, label: nightLabel(start), items: [item] });
  }

  // Pronos encore en jeu : en direct, terminés en attente de points, à venir.
  const games = new Map<number, { game: Game; league: League }>();
  for (const game of nhlGames) games.set(game.id, { game, league: "nhl" });
  for (const game of magnusGames) games.set(game.id, { game, league: "magnus" });

  const pendingPredictions = (pendingRows ?? []) as PredictionRow[];
  const fromSchedule: PendingItem[] = [];
  const started: PredictionRow[] = [];
  let laterCount = 0;
  for (const p of pendingPredictions) {
    const entry = games.get(p.game_id);
    if (entry && entry.league === leagueOf(p.game_id)) {
      fromSchedule.push(pendingFromGame(p, entry.game, entry.league));
    } else if (p.game_start_time && new Date(p.game_start_time) <= now) {
      // Au-delà d'une journée sans note, le match a sans doute été reporté :
      // on ne l'affiche pas comme "en direct".
      if (now.getTime() - Date.parse(p.game_start_time) < STALE_AFTER_MS) started.push(p);
    } else {
      laterCount++;
    }
  }
  const fromResults = (
    await Promise.all(started.slice(-AWAITING_LOOKUPS).map(pendingFromResult))
  ).filter((item): item is PendingItem => item !== null);

  const pendingSorted = [...fromResults, ...fromSchedule].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      Date.parse(a.startTime) - Date.parse(b.startTime),
  );
  const pending = pendingSorted.slice(0, PENDING_ROWS);
  const moreCount = pendingSorted.length - pending.length + laterCount;

  const isEmpty =
    results.length === 0 &&
    pendingSorted.length === 0 &&
    laterCount === 0 &&
    activity.length === 0 &&
    friendRequests.length === 0;

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-sky-900/40 bg-gradient-to-br from-sky-600/20 via-neutral-900 to-neutral-950 p-5 shadow-xl shadow-black/30">
          <div className="pointer-events-none absolute -right-6 -top-6 text-8xl opacity-10">🔔</div>
          <div className="text-center">
            <h1 className="text-3xl font-black italic tracking-tight text-neutral-50">
              Tes <span className="text-sky-400">notifs</span>
            </h1>
            <p className="mt-1 text-sm text-neutral-400">
              {unreadCount > 0
                ? `${unreadCount} nouvelle${unreadCount > 1 ? "s" : ""} depuis ta dernière visite`
                : "Tout est à jour 👌"}
            </p>
          </div>

          {nightPredictions.length > 0 && (
            <NightRecap
              label={nightLabel(nightPredictions[0].game_start_time)}
              rank={rank}
              results={nightPredictions.map((p) => ({
                gameId: p.game_id,
                isExactScore: Boolean(p.is_exact_score),
                points: p.points ?? 0,
              }))}
            />
          )}
        </div>

        {friendRequests.length > 0 && (
          <section className="space-y-2">
            <SectionLabel>Demandes d&apos;ami</SectionLabel>
            {friendRequests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-sky-800/60 bg-sky-950/60 p-3.5 text-sm"
              >
                <span className="min-w-0 text-sky-100">
                  <span className="font-semibold">{r.requester?.username ?? "?"}</span> veut être ton ami
                </span>
                <FriendRequestActions friendshipId={r.id} respondToFriendRequest={respondToFriendRequest} />
              </div>
            ))}
          </section>
        )}

        {resultGroups.length > 0 && (
          <section className="space-y-4">
            {resultGroups.map((group, i) => (
              <div key={group.key} className="space-y-2">
                <SectionLabel>
                  {i === 0 ? "Résultats · " : ""}Nuit du {group.label}
                </SectionLabel>
                <ul className="space-y-2">
                  {group.items.map((item) => (
                    <ResultCard key={item.gameId} item={item} />
                  ))}
                </ul>
              </div>
            ))}
            <p className="px-1 text-[11px] text-neutral-600">
              Scores après 60 minutes (sans prolongation ni tirs au but).{" "}
              <Link href="/profil" prefetch={false} className="text-sky-500">
                Tout ton historique
              </Link>
            </p>
          </section>
        )}

        {(pending.length > 0 || moreCount > 0) && (
          <section className="space-y-2">
            <SectionLabel>Tes pronos en cours</SectionLabel>
            {pending.length > 0 ? (
              <PendingList items={pending} moreCount={moreCount} now={now} />
            ) : (
              <Link
                href="/matches"
                prefetch={false}
                className="block rounded-2xl border border-neutral-800 bg-neutral-900 p-3.5 text-center text-sm text-sky-400"
              >
                {moreCount} prono{moreCount > 1 ? "s" : ""} à venir
              </Link>
            )}
          </section>
        )}

        {activity.length > 0 && (
          <section className="space-y-2">
            <SectionLabel>Activité</SectionLabel>
            <ul className="divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
              {activity.map((item) => (
                <ActivityRow key={item.id} item={item} now={now} />
              ))}
            </ul>
          </section>
        )}

        {isEmpty && (
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-5 text-center">
            <p className="text-sm font-semibold text-neutral-100">Tes résultats arrivent ici</p>
            <p className="mt-1 text-sm text-neutral-400">
              Fais tes pronos : après chaque match, tu verras ton score et tes points.
            </p>
            <Link
              href="/matches"
              prefetch={false}
              className="mt-3 inline-block rounded-full bg-sky-500 px-4 py-1.5 text-sm font-semibold text-neutral-950 active:scale-[0.97]"
            >
              Faire mes pronos
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
