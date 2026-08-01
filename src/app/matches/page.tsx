import { getUpcomingGames, getSeasonSchedule } from "@/lib/nhl";
import {
  getUpcomingGames as getMagnusUpcomingGames,
  getSeasonSchedule as getMagnusSeasonSchedule,
} from "@/lib/magnus";
import {
  getTeamStats,
  getLeagueAverageGoals,
  type TeamStats,
} from "@/lib/nhlStats";
import { estimateWinPoints } from "@/lib/scoring";
import { TEAM_TIMEZONES, getTeamColors } from "@/lib/nhlTeams";
import { getMagnusTeamColors } from "@/lib/magnusTeams";
import { createClient } from "@/utils/supabase/server";
import { toggleBoost } from "./actions";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import TeamBadge from "@/components/TeamBadge";
import SubmitButton from "@/components/SubmitButton";
import SlidingTabs from "@/components/SlidingTabs";
import LeagueSwitch from "@/components/LeagueSwitch";
import PredictionForm from "./PredictionForm";

// Forme commune à NhlGame (src/lib/nhl.ts) et MagnusGame (src/lib/magnus.ts)
// — les deux types sont structurellement identiques par conception, donc les
// fonctions de regroupement ci-dessous s'appliquent aux deux compétitions
// sans dupliquer cette logique par ligue.
type Game = {
  id: number;
  startTimeUTC: string;
  gameState: string;
  awayTeam: { abbrev: string; name: string; score?: number };
  homeTeam: { abbrev: string; name: string; score?: number };
  // Présent uniquement côté Magnus : vrai quand la rencontre vient du
  // calendrier statique de secours plutôt que d'être confirmée par l'API de
  // la ligue (voir src/lib/magnus.ts). La date/heure est alors une
  // estimation.
  isProvisional?: boolean;
};

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

// Un match est considéré "bientôt" dans les 2h qui précèdent son coup
// d'envoi — sert à afficher un point pulsant façon tableau de bord sportif
// en direct sur la carte du match dans l'onglet "À venir".
function isStartingSoon(iso: string): boolean {
  const diffMs = new Date(iso).getTime() - Date.now();
  return diffMs > 0 && diffMs < 2 * 60 * 60 * 1000;
}

// Barre d'accent en dégradé aux couleurs des deux équipes, affichée en haut
// de chaque carte de match "À venir" — donne un repère visuel immédiat façon
// scoreboard sportif, sans reproduire de logo (mêmes couleurs que TeamBadge).
function MatchAccentBar({
  awayAbbrev,
  homeAbbrev,
  league = "nhl",
}: {
  awayAbbrev: string;
  homeAbbrev: string;
  league?: "nhl" | "magnus";
}) {
  const getColors = league === "magnus" ? getMagnusTeamColors : getTeamColors;
  const away = getColors(awayAbbrev);
  const home = getColors(homeAbbrev);
  return (
    <div
      className="h-1.5 w-full"
      style={{
        background: `linear-gradient(90deg, ${away.primary}, ${home.primary})`,
      }}
    />
  );
}

// Pastille "VS" façon affichage de match, remplace le simple "@" entre les
// deux badges d'équipe sur les cartes "À venir".
function VsBadge() {
  return (
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-neutral-950 font-display text-xs tracking-wider text-neutral-500">
      VS
    </span>
  );
}

// Point pulsant "bientôt" — même motif que l'indicateur "EN DIRECT" de
// PlayerStatsSummary, réutilisé ici pour les matchs qui démarrent sous 2h.
function SoonPulse() {
  return (
    <span className="relative flex h-2 w-2" aria-hidden="true">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
      <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
    </span>
  );
}

// Cellule score/heure des lignes de calendrier compact : une fois le match
// terminé, le score prend le relief du font-display façon tableau
// d'affichage sportif plutôt que rester en texte neutre discret.
function CalendarScoreCell({ game }: { game: Game }) {
  const isFinal = game.awayTeam.score != null && game.homeTeam.score != null;
  return (
    <span
      title={
        game.isProvisional
          ? "Heure estimée, en attente de confirmation par la ligue"
          : undefined
      }
      className={`w-14 shrink-0 rounded-full text-center ${
        isFinal
          ? "bg-neutral-800 py-0.5 font-display text-sm tracking-wide text-sky-400"
          : game.isProvisional
            ? "text-xs text-amber-500/80"
            : "text-xs text-neutral-500"
      }`}
    >
      {isFinal
        ? `${game.awayTeam.score} - ${game.homeTeam.score}`
        : `${formatTime(game.startTimeUTC)}${game.isProvisional ? " ?" : ""}`}
    </span>
  );
}

function getWinPointsPreview(
  game: Game,
  teamStats: Map<string, TeamStats>,
  leagueAvgGoals: number,
) {
  const home = teamStats.get(game.homeTeam.abbrev);
  const away = teamStats.get(game.awayTeam.abbrev);
  if (!home || !away || !Number.isFinite(leagueAvgGoals)) return null;

  const preview = estimateWinPoints(home, away, leagueAvgGoals);
  if (
    !Number.isFinite(preview.homePoints) ||
    !Number.isFinite(preview.awayPoints)
  ) {
    return null;
  }
  return preview;
}

function groupByDay(games: Game[]) {
  const groups = new Map<string, { label: string; games: Game[] }>();
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

function formatMonthLabel(iso: string) {
  const label = new Date(iso).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Regroupe par mois (chacun affiché dans un <details> repliable, vu le
// volume de matchs sur une saison complète), puis par jour à l'intérieur.
// `hasUpcoming` sert à ouvrir automatiquement le premier mois contenant un
// match pas encore joué, pour atterrir directement sur "maintenant".
function groupByMonth(games: Game[]) {
  const now = Date.now();
  const months = new Map<
    string,
    {
      label: string;
      hasUpcoming: boolean;
      days: Map<string, { label: string; games: Game[] }>;
    }
  >();

  for (const game of games) {
    const date = new Date(game.startTimeUTC);
    const monthKey = `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
    if (!months.has(monthKey)) {
      months.set(monthKey, {
        label: formatMonthLabel(game.startTimeUTC),
        hasUpcoming: false,
        days: new Map(),
      });
    }
    const month = months.get(monthKey)!;
    if (date.getTime() > now) {
      month.hasUpcoming = true;
    }

    const dayKey = date.toDateString();
    if (!month.days.has(dayKey)) {
      month.days.set(dayKey, {
        label: formatDayLabel(game.startTimeUTC),
        games: [],
      });
    }
    month.days.get(dayKey)!.games.push(game);
  }

  return [...months.values()].map((month) => ({
    label: month.label,
    hasUpcoming: month.hasUpcoming,
    days: [...month.days.values()],
  }));
}

// Vrais matchs Ligue Magnus (calendrier complet + matchs à venir), pour de
// premier temps en lecture seule : le formulaire de pronostic (PredictionForm
// + submitPrediction) n'est pas encore branché côté Magnus. Comme la Ligue
// Magnus est hors saison au moment où ceci est écrit (0 match à venir), il
// n'y a de toute façon rien à pronostiquer pour l'instant — cette étape sert
// surtout à vérifier que les vraies données s'affichent correctement ; le
// pronostic Magnus viendra dans une étape suivante, à la reprise de la
// saison.
function MagnusSchedule({
  upcomingGames,
  seasonGames,
}: {
  upcomingGames: Game[];
  seasonGames: Game[];
}) {
  const dayGroups = groupByDay(upcomingGames);
  const monthGroups = groupByMonth(seasonGames);
  const firstUpcomingIndex = monthGroups.findIndex((g) => g.hasUpcoming);

  return (
    <SlidingTabs
      tabs={[
        {
          key: "avenir",
          label: "À venir",
          content: (
            <div className="space-y-4">
              {upcomingGames.length === 0 && (
                <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
                  Pas de matchs à venir pour le moment. La saison Ligue Magnus
                  reprend en septembre.
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
                        className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-md shadow-black/20"
                      >
                        <MatchAccentBar
                          awayAbbrev={game.awayTeam.abbrev}
                          homeAbbrev={game.homeTeam.abbrev}
                          league="magnus"
                        />
                        <div className="p-4">
                          <div className="mb-3 flex items-center justify-center gap-1.5">
                            {isStartingSoon(game.startTimeUTC) && <SoonPulse />}
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                                game.isProvisional
                                  ? "bg-amber-950/40 text-amber-500/80"
                                  : "bg-neutral-800 text-neutral-400"
                              }`}
                            >
                              {formatTime(game.startTimeUTC)}
                              {game.isProvisional ? " ?" : ""}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex flex-1 flex-col items-center gap-1.5">
                              <TeamBadge
                                abbrev={game.awayTeam.abbrev}
                                name={game.awayTeam.name}
                                size={40}
                                league="magnus"
                              />
                              <span className="text-sm font-medium text-neutral-200">
                                {game.awayTeam.name}
                              </span>
                            </div>
                            <VsBadge />
                            <div className="flex flex-1 flex-col items-center gap-1.5">
                              <TeamBadge
                                abbrev={game.homeTeam.abbrev}
                                name={game.homeTeam.name}
                                size={40}
                                league="magnus"
                              />
                              <span className="text-sm font-medium text-neutral-200">
                                {game.homeTeam.name}
                              </span>
                            </div>
                          </div>
                          <p className="mt-3 text-center text-[11px] text-neutral-600">
                            {game.isProvisional
                              ? "Heure estimée, en attente de confirmation par la ligue"
                              : "Pronostics Ligue Magnus bientôt disponibles"}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ),
        },
        {
          key: "calendrier",
          label: "📅 Calendrier",
          content: (
            <div className="space-y-4">
              {seasonGames.length === 0 && (
                <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
                  Le calendrier de la saison n&apos;est pas encore publié.
                </p>
              )}

              {monthGroups.map((group, index) => (
                <details
                  key={group.label}
                  open={index === firstUpcomingIndex}
                  className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
                >
                  <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-neutral-200">
                    {group.label}
                  </summary>
                  <div className="space-y-3 border-t border-neutral-800 px-3 pb-3 pt-3">
                    {group.days.map((day) => (
                      <div key={day.label} className="space-y-1.5">
                        <h3 className="px-1 text-xs font-medium text-neutral-500">
                          {day.label}
                        </h3>
                        <ul className="space-y-1.5">
                          {day.games.map((game) => (
                            <li
                              key={game.id}
                              className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm"
                            >
                              <div className="flex flex-1 items-center justify-end gap-1.5 text-right">
                                <span className="truncate text-neutral-300">
                                  {game.awayTeam.abbrev}
                                </span>
                                <TeamBadge
                                  abbrev={game.awayTeam.abbrev}
                                  name={game.awayTeam.name}
                                  size={22}
                                  league="magnus"
                                />
                              </div>
                              <CalendarScoreCell game={game} />
                              <div className="flex flex-1 items-center gap-1.5">
                                <TeamBadge
                                  abbrev={game.homeTeam.abbrev}
                                  name={game.homeTeam.name}
                                  size={22}
                                  league="magnus"
                                />
                                <span className="truncate text-neutral-300">
                                  {game.homeTeam.abbrev}
                                </span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </details>
              ))}
            </div>
          ),
        },
      ]}
    />
  );
}

export default async function MatchesPage() {
  // Les deux onglets ("À venir" et "Calendrier") sont désormais rendus tous
  // les deux côté serveur pour permettre un changement d'onglet coulissant
  // (via SlidingTabs) sans rechargement ni état de chargement intermédiaire
  // — même approche que ProfileTabs sur la page profil. Aucune de ces
  // sources de données (NHL + Ligue Magnus) ne dépend d'une autre : on les
  // lance toutes en parallèle.
  const [games, teamStats, seasonGames, magnusGames, magnusSeasonGames] =
    await Promise.all([
      getUpcomingGames(),
      getTeamStats(),
      getSeasonSchedule(),
      getMagnusUpcomingGames(),
      getMagnusSeasonSchedule(),
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
      ? supabase
          .from("profiles")
          .select("is_premium")
          .eq("id", user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const predictionByGameId = new Map(
    (predictions ?? []).map((p) => [p.game_id, p]),
  );

  const isPremium = profile?.is_premium ?? false;

  const dayGroups = groupByDay(games);
  const monthGroups = groupByMonth(seasonGames);
  const firstUpcomingIndex = monthGroups.findIndex((g) => g.hasUpcoming);

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-sky-900/40 bg-gradient-to-br from-sky-600/20 via-neutral-900 to-neutral-950 p-5 text-center shadow-xl shadow-black/30">
          <div className="pointer-events-none absolute -right-6 -top-6 text-8xl opacity-10">
            🏒
          </div>
          <h1 className="text-3xl font-black italic tracking-tight text-neutral-50">
            Les <span className="text-sky-400">matchs</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Pronostique et grimpe au classement 🥅
          </p>
        </div>

        <LeagueSwitch
          magnusContent={
            <MagnusSchedule
              upcomingGames={magnusGames}
              seasonGames={magnusSeasonGames}
            />
          }
          nhlContent={
            <SlidingTabs
              tabs={[
                {
                  key: "avenir",
                  label: "À venir",
                  content: (
                    <div className="space-y-4">
                      {games.length === 0 && (
                        <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
                          Pas de matchs à venir pour le moment. La saison NHL
                          reprend en octobre.
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
                                  className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900 shadow-md shadow-black/20"
                                >
                                  <MatchAccentBar
                                    awayAbbrev={game.awayTeam.abbrev}
                                    homeAbbrev={game.homeTeam.abbrev}
                                  />
                                  <div className="p-4">
                                    <div className="mb-3 flex items-center justify-center gap-1.5">
                                      {isStartingSoon(game.startTimeUTC) && (
                                        <SoonPulse />
                                      )}
                                      <span className="rounded-full bg-neutral-800 px-2.5 py-1 text-xs font-medium text-neutral-400">
                                        {frenchTime}
                                        {localTime &&
                                          localTime !== frenchTime && (
                                            <span className="text-neutral-500">
                                              {" "}
                                              · {localTime} heure locale
                                            </span>
                                          )}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-1">
                                      <div className="flex flex-1 flex-col items-center gap-1.5">
                                        <TeamBadge
                                          abbrev={game.awayTeam.abbrev}
                                          name={game.awayTeam.name}
                                          size={40}
                                        />
                                        <span className="text-sm font-medium text-neutral-200">
                                          {game.awayTeam.name}
                                        </span>
                                      </div>
                                      <VsBadge />
                                      <div className="flex flex-1 flex-col items-center gap-1.5">
                                        <TeamBadge
                                          abbrev={game.homeTeam.abbrev}
                                          name={game.homeTeam.name}
                                          size={40}
                                        />
                                        <span className="text-sm font-medium text-neutral-200">
                                          {game.homeTeam.name}
                                        </span>
                                      </div>
                                    </div>

                                    {winPoints && (
                                      <div className="mt-3 flex items-center justify-center gap-1.5 text-[11px]">
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
                                      initialAwayScore={
                                        predictionByGameId.get(game.id)
                                          ?.away_score
                                      }
                                      initialHomeScore={
                                        predictionByGameId.get(game.id)
                                          ?.home_score
                                      }
                                    />

                                    {predictionByGameId.has(game.id) &&
                                      (isPremium ? (
                                        <form
                                          action={toggleBoost}
                                          className="mt-2 flex justify-center"
                                        >
                                          <input
                                            type="hidden"
                                            name="gameId"
                                            value={game.id}
                                          />
                                          <input
                                            type="hidden"
                                            name="startTimeUTC"
                                            value={game.startTimeUTC}
                                          />
                                          <SubmitButton
                                            className={
                                              predictionByGameId.get(game.id)
                                                ?.boosted
                                                ? "rounded-md bg-amber-500 px-3 py-1 text-xs font-medium text-neutral-950 transition-all duration-150 active:scale-[0.97]"
                                                : "rounded-md border border-amber-500/40 px-3 py-1 text-xs font-medium text-amber-400 transition-all duration-150 hover:bg-amber-500/10 active:scale-[0.97]"
                                            }
                                          >
                                            {predictionByGameId.get(game.id)
                                              ?.boosted
                                              ? "🔥 Boosté x2 — retirer"
                                              : "Booster x2"}
                                          </SubmitButton>
                                        </form>
                                      ) : (
                                        <p className="mt-2 text-center text-[11px] text-neutral-600">
                                          🔒 Boost x2 réservé aux membres
                                          Premium
                                        </p>
                                      ))}
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  ),
                },
                {
                  key: "calendrier",
                  label: "📅 Calendrier",
                  content: (
                    <div className="space-y-4">
                      {seasonGames.length === 0 && (
                        <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
                          Le calendrier de la saison n&apos;est pas encore
                          publié.
                        </p>
                      )}

                      {monthGroups.map((group, index) => (
                        <details
                          key={group.label}
                          open={index === firstUpcomingIndex}
                          className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
                        >
                          <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-neutral-200">
                            {group.label}
                          </summary>
                          <div className="space-y-3 border-t border-neutral-800 px-3 pb-3 pt-3">
                            {group.days.map((day) => (
                              <div key={day.label} className="space-y-1.5">
                                <h3 className="px-1 text-xs font-medium text-neutral-500">
                                  {day.label}
                                </h3>
                                <ul className="space-y-1.5">
                                  {day.games.map((game) => (
                                    <li
                                      key={game.id}
                                      className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm"
                                    >
                                      <div className="flex flex-1 items-center justify-end gap-1.5 text-right">
                                        <span className="truncate text-neutral-300">
                                          {game.awayTeam.abbrev}
                                        </span>
                                        <TeamBadge
                                          abbrev={game.awayTeam.abbrev}
                                          name={game.awayTeam.name}
                                          size={22}
                                        />
                                      </div>
                                      <CalendarScoreCell game={game} />
                                      <div className="flex flex-1 items-center gap-1.5">
                                        <TeamBadge
                                          abbrev={game.homeTeam.abbrev}
                                          name={game.homeTeam.name}
                                          size={22}
                                        />
                                        <span className="truncate text-neutral-300">
                                          {game.homeTeam.abbrev}
                                        </span>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </details>
                      ))}
                    </div>
                  ),
                },
              ]}
            />
          }
        />
      </div>

      <BottomNav />
    </div>
  );
}
