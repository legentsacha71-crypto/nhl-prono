import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getRanking } from "@/lib/ranking";
import { getGameResult } from "@/lib/nhlResults";
import { getTeamName } from "@/lib/nhlTeams";
import { getRingForPoints, getNextRingTier } from "@/lib/profileRings";
import RingInfoBadge from "@/components/RingInfoBadge";
import TeamBadge from "@/components/TeamBadge";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import ProfileTabs from "@/components/ProfileTabs";
import PlayerStatsSummary from "@/components/PlayerStatsSummary";

// Profil en lecture seule d'un autre joueur (accessible depuis le
// classement ou la liste d'amis). Contrairement à /profil (son propre
// profil, éditable), cette page ne montre jamais un pronostic en attente :
// la requête sur `predictions` ne sélectionne explicitement que les lignes
// déjà notées (points non nul), ce qui correspond aussi à ce que la policy
// RLS autorise déjà pour un autre utilisateur — voir
// project_nhl_prono_leagues_ranking dans la mémoire du projet.
export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen p-6 pt-28 pb-24">
        <TopBar />
        <p className="text-center text-neutral-400">
          Connecte-toi pour voir ce profil.
        </p>
        <BottomNav />
      </div>
    );
  }

  // Son propre profil a sa page dédiée, éditable (avatar, équipe favorite,
  // favoris, amis, suppression de compte).
  if (id === user.id) {
    redirect("/profil");
  }

  const [
    { data: profile },
    { data: predictions },
    ranking,
    { data: season },
    { data: theirPick },
    { data: topScorerSeason },
    { data: theirTopScorerPick },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("username, favorite_team, avatar_url")
      .eq("id", id)
      .single(),
    supabase
      .from("predictions")
      .select(
        "game_id, away_score, home_score, points, is_exact_score, updated_at",
      )
      .eq("user_id", id)
      .not("points", "is", null)
      .order("updated_at", { ascending: false }),
    getRanking(supabase),
    supabase
      .from("stanley_cup_season")
      .select("lock_at, winner_team")
      .eq("id", 1)
      .single(),
    supabase
      .from("stanley_cup_picks")
      .select("team_abbrev, points")
      .eq("user_id", id)
      .maybeSingle(),
    supabase
      .from("top_scorer_season")
      .select("lock_at, winner_player")
      .eq("id", 1)
      .single(),
    supabase
      .from("top_scorer_picks")
      .select("player_name, points")
      .eq("user_id", id)
      .maybeSingle(),
  ]);

  if (!profile) notFound();

  const username = profile.username ?? "Joueur";
  const favoriteTeam = profile.favorite_team as string | null | undefined;
  const avatarUrl = profile.avatar_url as string | null | undefined;

  const graded = predictions ?? [];
  const correctCount = graded.filter((p) => (p.points ?? 0) > 0).length;
  const exactCount = graded.filter((p) => p.is_exact_score).length;

  const rank = ranking.findIndex((entry) => entry.userId === id) + 1;
  const combinedPoints =
    ranking.find((entry) => entry.userId === id)?.totalPoints ?? 0;
  const ring = getRingForPoints(combinedPoints);
  const nextRingTier = getNextRingTier(combinedPoints);

  const stats = {
    points: combinedPoints,
    rank,
    totalRanked: ranking.length,
    pronosCount: graded.length,
    gradedCount: graded.length,
    correctCount,
    exactCount,
  };

  const recent = graded.slice(0, 8);
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

  // Ne rien montrer côté "favoris" tant que la saison n'est pas résolue :
  // avant ça, on ne récupère de toute façon rien pour un autre joueur (la
  // policy RLS des picks suit la même logique "points non nul" que
  // predictions), mais on garde aussi cette condition explicite côté page.
  const stanleyCupResolved = Boolean(season?.winner_team) && Boolean(theirPick);
  const topScorerResolved =
    Boolean(topScorerSeason?.winner_player) && Boolean(theirTopScorerPick);

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="relative overflow-hidden rounded-3xl">
          <Image
            src="/images/profile-hero.jpg"
            alt=""
            fill
            sizes="(min-width: 448px) 448px, 100vw"
            className="object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-neutral-950/35 via-neutral-950/80 to-neutral-950" />

          <div className="relative flex flex-col items-center gap-2 px-6 py-6">
            <h1 className="text-2xl font-bold text-sky-400">{username}</h1>

            <div className="relative h-28 w-28">
              <div className="absolute inset-0 flex items-center justify-center">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={username}
                    className="h-24 w-24 rounded-full border border-neutral-700 object-cover shadow-lg shadow-black/30"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full border border-neutral-700 bg-gradient-to-br from-neutral-800 to-neutral-900 text-3xl font-bold text-neutral-400 shadow-lg shadow-black/30">
                    {username.slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={ring.image}
                alt={`Palier ${ring.label}`}
                className="pointer-events-none absolute inset-0 z-10 h-28 w-28 object-contain"
              />
            </div>

            <p className="flex items-center gap-1 text-xs font-medium text-neutral-400">
              {ring.label}
              <RingInfoBadge />
              {nextRingTier && (
                <span className="text-neutral-600">
                  · encore {nextRingTier.threshold - combinedPoints} pts pour{" "}
                  {nextRingTier.label}
                </span>
              )}
            </p>

            {favoriteTeam ? (
              <div className="flex items-center gap-2 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 shadow-sm shadow-black/20">
                <TeamBadge
                  abbrev={favoriteTeam}
                  name={getTeamName(favoriteTeam)}
                  size={28}
                />
                <span>{getTeamName(favoriteTeam)}</span>
              </div>
            ) : (
              <p className="text-xs text-neutral-500">
                Pas d&apos;équipe favorite.
              </p>
            )}
          </div>
        </div>

        <ProfileTabs
          general={
            <div className="space-y-6">
              <div>
                <h2 className="mb-1 font-medium text-neutral-200">
                  🏒 Pronos récents
                </h2>
                <p className="mb-2 text-xs text-neutral-500">
                  Seuls les pronos déjà joués sont visibles.
                </p>
                {recent.length === 0 ? (
                  <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
                    Aucun prono joué pour le moment.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {results.map(({ prediction, result }) => (
                      <li
                        key={prediction.game_id}
                        className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3 text-sm shadow-sm shadow-black/20"
                      >
                        <span className="text-neutral-300">
                          {result
                            ? `${result.awayAbbrev} @ ${result.homeAbbrev}`
                            : `Match #${prediction.game_id}`}
                          <span className="ml-2 text-neutral-500">
                            (prono {prediction.away_score}-
                            {prediction.home_score})
                          </span>
                        </span>
                        <span
                          className={`font-medium ${
                            (prediction.points ?? 0) > 0
                              ? "text-emerald-400"
                              : "text-neutral-600"
                          }`}
                        >
                          {prediction.points ?? 0} pts
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {(stanleyCupResolved || topScorerResolved) && (
                <div className="space-y-3">
                  <h2 className="font-medium text-neutral-200">⭐ Favoris</h2>
                  {stanleyCupResolved && theirPick && (
                    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-lg shadow-black/20">
                      <p className="mb-2 text-sm font-medium text-neutral-300">
                        Vainqueur de la coupe Stanley
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-300">
                          Pick : {getTeamName(theirPick.team_abbrev)}
                        </span>
                        <span className="font-medium text-sky-400">
                          {theirPick.points ?? 0} pts
                        </span>
                      </div>
                    </div>
                  )}
                  {topScorerResolved && theirTopScorerPick && (
                    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-lg shadow-black/20">
                      <p className="mb-2 text-sm font-medium text-neutral-300">
                        Meilleur buteur de la saison
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-neutral-300">
                          Pick : {theirTopScorerPick.player_name}
                        </span>
                        <span className="font-medium text-sky-400">
                          {theirTopScorerPick.points ?? 0} pts
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          }
          stats={<PlayerStatsSummary stats={stats} />}
        />
      </div>

      <BottomNav />
    </div>
  );
}
