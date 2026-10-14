import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { getCurrentUser } from "@/utils/supabase/user";
import { getCurrentUsername } from "@/lib/unreadCount";
import { getUpcomingGames as getNhlUpcomingGames } from "@/lib/nhl";
import { getUpcomingGames as getMagnusUpcomingGames } from "@/lib/magnus";
import { isLive, kickoffLabel, type Game } from "@/lib/gameDates";
import { getTeamName } from "@/lib/nhlTeams";
import { getMagnusTeamName } from "@/lib/magnusTeams";
import { shortNhlName } from "@/components/RecentPredictions";
import TopBar from "@/components/TopBar";
import TeamBadge from "@/components/TeamBadge";

// Écran d'accueil d'un nouveau joueur (première connexion sans aucun
// prono, voir login dans src/app/login/actions.ts) : le principe en trois
// étapes et les prochains matchs, pour l'amener à faire son premier prono.

const STEPS = [
  { title: "Choisis un match", text: "NHL ou Ligue Magnus, tous les matchs à venir sont dans l'onglet Matchs." },
  {
    title: "Tape ton score",
    text: "Le score après 60 minutes : la prolongation et les tirs au but ne comptent pas.",
  },
  { title: "Marque des points", text: "Bon vainqueur = des points. Score exact = gros bonus 🎯" },
];

const NEXT_GAMES = 4;

function teamName(abbrev: string, league: "nhl" | "magnus") {
  return league === "magnus" ? getMagnusTeamName(abbrev) : shortNhlName(getTeamName(abbrev));
}

export default async function WelcomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const now = new Date();
  const [username, nhlGames, magnusGames] = await Promise.all([
    getCurrentUsername(),
    getNhlUpcomingGames().catch((): Game[] => []),
    getMagnusUpcomingGames().catch((): Game[] => []),
  ]);

  // Prochains matchs encore pronostiquables, toutes compétitions confondues.
  const nextGames = [
    ...nhlGames.map((game) => ({ game, league: "nhl" as const })),
    ...magnusGames.filter((g) => !g.isProvisional).map((game) => ({ game, league: "magnus" as const })),
  ]
    .filter(({ game }) => !isLive(game) && Date.parse(game.startTimeUTC) > now.getTime())
    .sort((a, b) => Date.parse(a.game.startTimeUTC) - Date.parse(b.game.startTimeUTC))
    .slice(0, NEXT_GAMES);

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-5">
        <div className="relative overflow-hidden rounded-2xl border border-sky-900/40 bg-gradient-to-br from-sky-600/25 via-neutral-900 to-neutral-950 p-6 text-center shadow-xl shadow-black/30">
          <div className="pointer-events-none absolute -right-6 -top-6 text-8xl opacity-10">🏒</div>
          <h1 className="text-3xl font-black italic tracking-tight text-neutral-50">
            Bienvenue{username ? "," : ""} <span className="text-sky-400">{username ?? ""}</span> 👋
          </h1>
          <p className="mt-2 text-sm text-neutral-300">
            Pronostique les matchs, marque des points et défie tes amis.
          </p>
        </div>

        <ol className="divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex items-start gap-3 px-3.5 py-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sky-500 font-display text-base text-neutral-950">
                {index + 1}
              </span>
              <span className="text-sm leading-snug text-neutral-400">
                <span className="block font-semibold text-neutral-100">{step.title}</span>
                {step.text}
              </span>
            </li>
          ))}
        </ol>

        {nextGames.length > 0 && (
          <section className="space-y-2">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Les prochains matchs
            </h2>
            <ul className="divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
              {nextGames.map(({ game, league }) => (
                <li key={game.id}>
                  <Link
                    href="/matches"
                    prefetch={false}
                    className="flex items-center gap-3 px-3.5 py-3 transition-colors active:bg-neutral-800/70"
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <TeamBadge abbrev={game.homeTeam.abbrev} size={26} league={league} />
                      <span className="truncate text-sm text-neutral-100">
                        {teamName(game.homeTeam.abbrev, league)}
                        <span className="mx-1.5 text-neutral-600">vs</span>
                        {teamName(game.awayTeam.abbrev, league)}
                      </span>
                      <TeamBadge abbrev={game.awayTeam.abbrev} size={26} league={league} />
                    </span>
                    <span className="shrink-0 text-right text-[11px] text-neutral-400">
                      {kickoffLabel(game.startTimeUTC, now)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Bouton toujours visible au-dessus de la barre d'onglets (et de son
            cercle qui dépasse), même avant d'avoir fait défiler l'écran. */}
        <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-20 space-y-2 pt-2">
          <Link
            href="/matches"
            prefetch={false}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-sky-500 py-4 text-base font-bold text-neutral-950 shadow-xl shadow-black/60 transition-transform active:scale-[0.98]"
          >
            Faire mon premier prono
            <ArrowRight size={20} strokeWidth={2.5} aria-hidden="true" />
          </Link>
        </div>
        <p className="text-center">
          <Link href="/" prefetch={false} className="text-sm text-neutral-500">
            Plus tard
          </Link>
        </p>
      </div>
    </div>
  );
}
