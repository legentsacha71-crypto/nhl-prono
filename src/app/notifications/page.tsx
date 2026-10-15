import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";
import { respondToFriendRequest } from "@/app/profil/actions";
import TopBar from "@/components/TopBar";
import FriendRequestActions from "@/components/FriendRequestActions";
import StoreReviewPrompt from "@/components/StoreReviewPrompt";
import {
  ActivityRow,
  LiveRow,
  NightRecap,
  ResultRow,
  RowCard,
  SectionLabel,
} from "@/components/NotificationFeed";
import { getGameResult } from "@/lib/gameResults";
import { isMagnusGameId } from "@/lib/competition";
import { getUpcomingGames as getNhlUpcomingGames } from "@/lib/nhl";
import { getUpcomingGames as getMagnusUpcomingGames } from "@/lib/magnus";
import { isLive, type Game } from "@/lib/gameDates";
import {
  matchupKey,
  nightAgeInDays,
  nightKey,
  nightTitle,
  pointsNotificationKey,
  toActivityItem,
  type League,
  type PendingItem,
  type ResultItem,
} from "@/lib/notificationFeed";

// Nombre de résultats affichés (une requête de score par match, en cache
// une fois le match noté).
const RESULT_ROWS = 15;
// Pronos terminés mais pas encore notés : leur score est relu en direct.
const AWAITING_LOOKUPS = 6;
// Au-delà d'une journée sans note, le match a sans doute été reporté.
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
// Le récap de la dernière nuit n'est affiché que s'il est récent.
const RECAP_MAX_AGE_DAYS = 3;

type PredictionRow = {
  game_id: number;
  away_score: number;
  home_score: number;
  points: number | null;
  is_exact_score: boolean | null;
  boosted: boolean | null;
  game_start_time: string | null;
};

const PREDICTION_COLUMNS =
  "game_id, away_score, home_score, points, is_exact_score, boosted, game_start_time";

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
      isExactScore: Boolean(p.is_exact_score),
      boosted: Boolean(p.boosted),
      isNew: newMatchups.has(matchupKey(result.homeAbbrev, result.awayAbbrev)),
    };
  } catch {
    return null;
  }
}

function liveFromGame(p: PredictionRow, game: Game, league: League): PendingItem {
  return {
    gameId: p.game_id,
    league,
    homeAbbrev: game.homeTeam.abbrev,
    awayAbbrev: game.awayTeam.abbrev,
    predictedHome: p.home_score,
    predictedAway: p.away_score,
    startTime: game.startTimeUTC,
    status: "live",
    homeScore: game.scoreUnavailable ? null : (game.homeTeam.score ?? null),
    awayScore: game.scoreUnavailable ? null : (game.awayTeam.score ?? null),
  };
}

// Match commencé qui n'est plus dans la liste des matchs à venir : terminé
// (en attente de notation) ou pas encore marqué comme commencé par l'API.
async function liveFromResult(p: PredictionRow): Promise<PendingItem | null> {
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
    // Quelques vieux pronos n'ont pas d'heure de match : sans nullsFirst:
    // false, Postgres les classe en tête d'un tri décroissant. Assez de
    // lignes pour couvrir toute la dernière nuit dans le récap.
    supabase
      .from("predictions")
      .select(PREDICTION_COLUMNS)
      .eq("user_id", user.id)
      .not("points", "is", null)
      .order("game_start_time", { ascending: false, nullsFirst: false })
      .limit(40),
    // Pronos pas encore notés dont le match a commencé.
    supabase
      .from("predictions")
      .select(PREDICTION_COLUMNS)
      .eq("user_id", user.id)
      .is("points", null)
      .lte("game_start_time", now.toISOString())
      .gte("game_start_time", new Date(now.getTime() - STALE_AFTER_MS).toISOString())
      .order("game_start_time", { ascending: true }),
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

  // Les notifications de points sont remplacées par les lignes de résultat :
  // on ne s'en sert que pour marquer les résultats pas encore vus.
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

  // Récap de la dernière nuit jouée, si elle est récente.
  const graded = (gradedRows ?? []) as PredictionRow[];
  const lastStart = graded[0]?.game_start_time ?? null;
  const showRecap = lastStart !== null && nightAgeInDays(lastStart, now) <= RECAP_MAX_AGE_DAYS;
  const nightPredictions = showRecap
    ? graded.filter((p) => nightKey(p.game_start_time) === nightKey(lastStart))
    : [];

  const startByGame = new Map(graded.map((p) => [p.game_id, p.game_start_time]));
  const results = (
    await Promise.all(graded.slice(0, RESULT_ROWS).map((p) => toResultItem(p, newMatchups)))
  ).filter((item): item is ResultItem => item !== null);

  const resultGroups: { key: string; title: string; items: ResultItem[] }[] = [];
  for (const item of results) {
    const start = startByGame.get(item.gameId) ?? null;
    const key = nightKey(start);
    const last = resultGroups[resultGroups.length - 1];
    if (last && last.key === key) last.items.push(item);
    else resultGroups.push({ key, title: nightTitle(start, now), items: [item] });
  }

  // Matchs pronostiqués en cours, ou terminés en attente de points.
  const games = new Map<number, { game: Game; league: League }>();
  for (const game of nhlGames) games.set(game.id, { game, league: "nhl" });
  for (const game of magnusGames) games.set(game.id, { game, league: "magnus" });

  const fromSchedule: PendingItem[] = [];
  const toLookUp: PredictionRow[] = [];
  for (const p of (pendingRows ?? []) as PredictionRow[]) {
    const entry = games.get(p.game_id);
    if (entry && entry.league === leagueOf(p.game_id)) {
      // Encore dans le calendrier : en direct, ou coup d'envoi un peu retardé.
      if (isLive(entry.game)) fromSchedule.push(liveFromGame(p, entry.game, entry.league));
    } else {
      toLookUp.push(p);
    }
  }
  const fromResults = (
    await Promise.all(toLookUp.slice(-AWAITING_LOOKUPS).map(liveFromResult))
  ).filter((item): item is PendingItem => item !== null);
  const live = [...fromSchedule, ...fromResults].sort(
    (a, b) => Date.parse(a.startTime) - Date.parse(b.startTime),
  );

  const isEmpty =
    results.length === 0 && live.length === 0 && activity.length === 0 && friendRequests.length === 0;

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
                ? `${unreadCount} nouvelle${unreadCount > 1 ? "s" : ""}`
                : "Tout est à jour 👌"}
            </p>
          </div>

          {nightPredictions.length > 0 && (
            <NightRecap
              title={nightTitle(lastStart, now)}
              results={nightPredictions.map((p) => ({ points: p.points ?? 0 }))}
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

        {live.length > 0 && (
          <RowCard title="En ce moment" titleClass="text-red-400" lastColumn="">
            {live.map((item) => (
              <LiveRow key={item.gameId} item={item} />
            ))}
          </RowCard>
        )}

        {results.some((item) => item.isNew && item.isExactScore) && <StoreReviewPrompt celebrate />}

        {resultGroups.length > 0 && (
          <section className="space-y-3">
            <SectionLabel>Tes résultats</SectionLabel>
            {resultGroups.map((group) => (
              <RowCard key={group.key} title={group.title} titleClass="text-neutral-300" lastColumn="Points">
                {group.items.map((item) => (
                  <ResultRow key={item.gameId} item={item} />
                ))}
              </RowCard>
            ))}
            <p className="px-1 text-[11px] text-neutral-600">
              Scores après 60 minutes (sans prolongation ni tirs au but).{" "}
              <Link href="/profil" prefetch={false} className="text-sky-500">
                Tout ton historique
              </Link>
            </p>
          </section>
        )}

        {activity.length > 0 && (
          <section className="space-y-2">
            <SectionLabel>Amis et ligues</SectionLabel>
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
