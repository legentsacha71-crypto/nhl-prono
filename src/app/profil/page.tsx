import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";
import { getRanking } from "@/lib/ranking";
import { getGameResult } from "@/lib/gameResults";
import { isMagnusGameId } from "@/lib/competition";
import { getTeamName } from "@/lib/nhlTeams";
import { STANLEY_CUP_CANDIDATES } from "@/lib/nhlStanleyCup";
import { TOP_SCORER_CANDIDATES } from "@/lib/nhlScorers";
import { getRingForPoints, getNextRingTier } from "@/lib/profileRings";
import RingInfoBadge from "@/components/RingInfoBadge";
import {
  updateFavoriteTeam,
  submitStanleyCupPick,
  uploadAvatar,
  sendFriendRequest,
  respondToFriendRequest,
  removeFriend,
  submitTopScorerPick,
  deleteAccount,
} from "./actions";
import TopBar from "@/components/TopBar";
import { getUnreadCount } from "@/lib/unreadCount";
import FavoriteTeamPicker from "@/components/FavoriteTeamPicker";
import FavoritePick, { type FavoriteOption } from "@/components/FavoritePick";
import { Lock } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import DeleteAccountForm from "@/components/DeleteAccountForm";
import AvatarUploadForm from "@/components/AvatarUploadForm";
import ProfileTabs from "@/components/ProfileTabs";
import AddFriendForm from "@/components/AddFriendForm";
import FriendRequestActions from "@/components/FriendRequestActions";
import ProfileStatsPanel from "@/components/ProfileStatsPanel";
import ProfileSection from "@/components/ProfileSection";
import RecentPredictions, {
  latestPlayed,
  toRecentPrediction,
} from "@/components/RecentPredictions";

function formatLockCountdown(lockAt: string): string {
  const diffMs = new Date(lockAt).getTime() - Date.now();
  const days = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  const dateLabel = new Date(lockAt).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Paris",
  });
  return `Modifiable jusqu'au ${dateLabel} (J-${days})`;
}

export default async function ProfilPage() {
  void getUnreadCount();
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="min-h-screen p-6 pt-28 pb-24">
        <TopBar />
        <p className="text-center text-neutral-400">
          Connecte-toi pour voir ton profil.
        </p>
      </div>
    );
  }

  // Toutes ces requêtes ne dépendent que de l'utilisateur (ou de rien du
  // tout), pas les unes des autres : on les lance toutes en parallèle
  // plutôt qu'en série pour réduire le temps de chargement de la page.
  const [
    { data: profile },
    { data: predictions },
    ranking,
    [
      { data: season },
      { data: myPick },
      { data: topScorerSeason },
      { data: myTopScorerPick },
    ],
    { data: friendshipRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, favorite_team, avatar_url")
      .eq("id", user.id)
      .single(),
    supabase
      .from("predictions")
      .select(
        "game_id, away_score, home_score, points, base_points, bonus_points, is_exact_score, boosted, game_start_time, updated_at",
      )
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    getRanking(supabase),
    Promise.all([
      supabase
        .from("stanley_cup_season")
        .select("lock_at, winner_team")
        .eq("id", 1)
        .single(),
      supabase
        .from("stanley_cup_picks")
        .select("team_abbrev, points")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("top_scorer_season")
        .select("lock_at, winner_player")
        .eq("id", 1)
        .single(),
      supabase
        .from("top_scorer_picks")
        .select("player_name, points")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]),
    supabase
      .from("friendships")
      .select(
        "id, status, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(username), addressee:profiles!friendships_addressee_id_fkey(username)",
      )
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`),
  ]);

  const username = profile?.username ?? user.email ?? "Joueur";
  const favoriteTeam = profile?.favorite_team as string | null | undefined;
  const avatarUrl = profile?.avatar_url as string | null | undefined;

  const all = predictions ?? [];
  const graded = all.filter((p) => p.points !== null);
  const exactScoreCount = graded.filter((p) => p.is_exact_score).length;

  const rank = ranking.findIndex((entry) => entry.userId === user.id) + 1;
  const combinedPoints =
    ranking.find((entry) => entry.userId === user.id)?.totalPoints ?? 0;
  const ring = getRingForPoints(combinedPoints);
  const nextRingTier = getNextRingTier(combinedPoints);

  const correctCount = graded.filter((p) => (p.points ?? 0) > 0).length;

  // Ventilation par compétition pour la bascule NHL / Ligue Magnus de
  // l'onglet Stats — dérivée du seul game_id, voir isMagnusGameId.
  const nhlAll = all.filter((p) => !isMagnusGameId(p.game_id));
  const nhlGraded = nhlAll.filter((p) => p.points !== null);
  const magnusAll = all.filter((p) => isMagnusGameId(p.game_id));
  const magnusGraded = magnusAll.filter((p) => p.points !== null);

  const initialStats = {
    points: combinedPoints,
    rank,
    totalRanked: ranking.length,
    pronosCount: all.length,
    gradedCount: graded.length,
    correctCount,
    exactCount: exactScoreCount,
    nhl: {
      points: nhlGraded.reduce((sum, p) => sum + (p.points ?? 0), 0),
      pronosCount: nhlAll.length,
      gradedCount: nhlGraded.length,
      correctCount: nhlGraded.filter((p) => (p.points ?? 0) > 0).length,
      exactCount: nhlGraded.filter((p) => p.is_exact_score).length,
    },
    magnus: {
      points: magnusGraded.reduce((sum, p) => sum + (p.points ?? 0), 0),
      pronosCount: magnusAll.length,
      gradedCount: magnusGraded.length,
      correctCount: magnusGraded.filter((p) => (p.points ?? 0) > 0).length,
      exactCount: magnusGraded.filter((p) => p.is_exact_score).length,
    },
  };

  const isLocked = !season || new Date(season.lock_at) <= new Date();

  const isTopScorerLocked =
    !topScorerSeason || new Date(topScorerSeason.lock_at) <= new Date();

  const stanleyCupOptions: FavoriteOption[] = STANLEY_CUP_CANDIDATES.map(
    (c) => ({
      id: c.abbrev,
      label: getTeamName(c.abbrev),
      points: c.points,
      probability: c.probability,
      teamAbbrev: c.abbrev,
    }),
  );
  const topScorerOptions: FavoriteOption[] = TOP_SCORER_CANDIDATES.map(
    (c) => ({
      id: c.name,
      label: c.name,
      points: c.points,
      probability: c.probability,
    }),
  );

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

  const recent = latestPlayed(graded, 8);
  const pendingCount = all.length - graded.length;
  const recentItems = await Promise.all(
    recent.map(async (p) => {
      try {
        return toRecentPrediction(
          p,
          // Pronostics déjà notés : matchs terminés, score lisible en cache.
          await getGameResult(p.game_id, { settled: true }),
        );
      } catch {
        return toRecentPrediction(p, null);
      }
    }),
  );

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
        friendId,
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
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="relative rounded-3xl">
          {/* Illustration décorative en fond, pour casser le vide visuel du
              haut de la page profil. Elle s'estompe en dégradé jusqu'à la
              couleur de fond exacte du site, pile après le sélecteur
              d'équipe favorite : le reste de la page reste sur le fond uni
              habituel.
              L'overflow-hidden (nécessaire pour arrondir les coins de
              l'image) est isolé sur ce calque de fond plutôt que posé sur
              le conteneur entier : sinon il rognait aussi le menu déroulant
              du sélecteur d'équipe favorite, qui doit pouvoir déborder
              au-delà de cette carte quand il s'ouvre. */}
          <div className="absolute inset-0 overflow-hidden rounded-3xl">
            <Image
              src="/images/profile-hero.jpg"
              alt=""
              fill
              sizes="(min-width: 448px) 448px, 100vw"
              className="object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/35 via-neutral-950/80 to-neutral-950" />
          </div>

          <div className="relative flex flex-col items-center gap-3 px-6 py-7">
            <h1 className="text-2xl font-bold text-sky-400">{username}</h1>

            <div className="relative h-28 w-28">
              <div className="absolute inset-0 flex items-center justify-center">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={username}
                    width={96}
                    height={96}
                    loading="eager"
                    className="h-24 w-24 rounded-full border border-neutral-700 object-cover shadow-lg shadow-black/30 transition-transform duration-200 hover:scale-105"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border border-neutral-700 bg-gradient-to-br from-neutral-800 to-neutral-900 text-3xl font-bold text-neutral-400 shadow-lg shadow-black/30 transition-transform duration-200 hover:scale-105">
                    {username.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              <Image
                src={ring.image}
                alt={`Palier ${ring.label}`}
                width={112}
                height={112}
                loading="eager"
                className="pointer-events-none absolute inset-0 z-10 h-28 w-28 object-contain"
              />
              <div className="absolute right-0 bottom-0 z-20">
                <AvatarUploadForm uploadAvatar={uploadAvatar} />
              </div>
            </div>

            <p className="flex items-center gap-1.5 text-xs font-medium text-neutral-400">
              <span className="rounded-full bg-neutral-900/80 px-2 py-0.5 text-neutral-300">
                {ring.label}
              </span>
              <RingInfoBadge />
              {nextRingTier && (
                <span className="text-neutral-600">
                  encore {nextRingTier.threshold - combinedPoints} pts pour{" "}
                  {nextRingTier.label}
                </span>
              )}
            </p>

            <FavoriteTeamPicker
              favoriteTeam={favoriteTeam}
              updateFavoriteTeam={updateFavoriteTeam}
            />
          </div>
        </div>

        <ProfileTabs
          general={
            <div className="space-y-4">
              <ProfileSection title="🏒 Pronos récents">
                {pendingCount > 0 && (
                  <p className="mb-2 text-xs text-neutral-500">
                    {pendingCount} prono{pendingCount > 1 ? "s" : ""} en
                    attente (matchs à venir).
                  </p>
                )}
                {recent.length === 0 ? (
                  <p className="py-3 text-center text-sm text-neutral-500">
                    Aucun prono joué pour le moment.
                  </p>
                ) : (
                  <RecentPredictions items={recentItems} />
                )}
              </ProfileSection>

              <ProfileSection title="👥 Mes amis">
                <AddFriendForm sendFriendRequest={sendFriendRequest} />

                {incomingRequests.length > 0 && (
                  <div className="mb-3 space-y-2">
                    {incomingRequests.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-lg border border-sky-800/70 bg-sky-950/60 p-3 text-sm shadow-sm shadow-sky-950/30"
                      >
                        <span className="text-sky-100">
                          {r.requester?.username ?? "?"} veut être ton ami
                        </span>
                        <FriendRequestActions
                          friendshipId={r.id}
                          respondToFriendRequest={respondToFriendRequest}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {friends.length === 0 ? (
                  <p className="py-3 text-center text-sm text-neutral-500">
                    Aucun ami pour le moment.
                  </p>
                ) : (
                  <ul className="divide-y divide-neutral-800/60">
                    {friends.map((f) => (
                      <li
                        key={f.friendshipId}
                        className="-mx-1 flex items-center justify-between rounded-md px-1 py-2.5 text-sm transition-colors duration-150 hover:bg-neutral-800/40"
                      >
                        <Link
                          href={`/profil/${f.friendId}`}
                          prefetch={false}
                          className="text-neutral-200 transition-colors duration-150 hover:text-sky-400"
                        >
                          {f.username}
                        </Link>
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
                            <SubmitButton className="text-xs text-neutral-500 transition-all duration-150 hover:text-red-400 active:scale-[0.97]">
                              Retirer
                            </SubmitButton>
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
              </ProfileSection>

              <ProfileSection title="⭐ Mes favoris">
                {lockGroups.size > 0 && (
                  <div className="mb-3 space-y-1">
                    {[...lockGroups.entries()].map(([lockAt, labels]) => (
                      <p
                        key={lockAt}
                        className="flex items-center gap-1.5 text-xs text-neutral-400"
                      >
                        <Lock size={12} className="shrink-0" aria-hidden="true" />
                        {lockGroups.size > 1 ? `${labels.join(" & ")} : ` : ""}
                        {formatLockCountdown(lockAt)}
                      </p>
                    ))}
                    <p className="text-xs text-neutral-500">
                      Plus ton choix est outsider, plus il rapporte de points
                      en fin de saison.
                    </p>
                  </div>
                )}
                <div className="space-y-3">
                  {!season ? (
                    <p className="rounded-xl bg-neutral-950/40 p-3 text-sm text-neutral-500">
                      Coupe Stanley : pas encore configurée pour cette saison.
                    </p>
                  ) : (
                    <FavoritePick
                      kind="team"
                      title="Vainqueur de la coupe Stanley"
                      options={stanleyCupOptions}
                      pickId={myPick?.team_abbrev ?? null}
                      mode={
                        season.winner_team
                          ? "resolved"
                          : isLocked
                            ? "locked"
                            : "open"
                      }
                      submitPick={submitStanleyCupPick}
                      earned={myPick?.points ?? 0}
                      winnerLabel={
                        season.winner_team
                          ? getTeamName(season.winner_team)
                          : undefined
                      }
                    />
                  )}

                  {!topScorerSeason ? (
                    <p className="rounded-xl bg-neutral-950/40 p-3 text-sm text-neutral-500">
                      Meilleur buteur : pas encore configuré pour cette saison.
                    </p>
                  ) : (
                    <FavoritePick
                      kind="player"
                      title="Meilleur buteur de la saison"
                      options={topScorerOptions}
                      pickId={myTopScorerPick?.player_name ?? null}
                      mode={
                        topScorerSeason.winner_player
                          ? "resolved"
                          : isTopScorerLocked
                            ? "locked"
                            : "open"
                      }
                      submitPick={submitTopScorerPick}
                      earned={myTopScorerPick?.points ?? 0}
                      winnerLabel={topScorerSeason.winner_player ?? undefined}
                    />
                  )}
                </div>
              </ProfileSection>

              <div className="pt-1 text-center">
                <DeleteAccountForm deleteAccount={deleteAccount} />
              </div>
            </div>
          }
          stats={<ProfileStatsPanel initial={initialStats} />}
        />
      </div>

    </div>
  );
}
