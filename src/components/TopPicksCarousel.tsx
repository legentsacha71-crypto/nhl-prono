import Link from "next/link";
import { Flame, Target } from "lucide-react";
import RankAvatar from "@/components/RankAvatar";
import TeamBadge from "@/components/TeamBadge";
import { nightTitle } from "@/lib/notificationFeed";
import type { TopPick } from "@/lib/topPicks";

// Bande qui défile horizontalement sur l'accueil : les meilleurs pronos de
// la dernière soirée (joueur, match, prono, points). Un score exact a sa
// carte dorée.
export default function TopPicksCarousel({
  nightStart,
  picks,
  now,
}: {
  nightStart: string;
  picks: TopPick[];
  now: Date;
}) {
  return (
    <section className="w-full max-w-md space-y-2">
      <h2 className="flex items-baseline justify-between px-1">
        <span className="text-sm font-semibold text-neutral-100">🔥 Les meilleurs pronos</span>
        <span className="text-xs text-neutral-500">{nightTitle(nightStart, now)}</span>
      </h2>
      <ol
        className="-mx-6 flex snap-x snap-mandatory scroll-px-6 gap-3 overflow-x-auto px-6 pb-1"
        // Pas de barre de défilement, comme dans une appli (en style direct :
        // la règle globale `* { scrollbar-width: thin }` l'emporterait sur
        // une classe Tailwind).
        style={{ scrollbarWidth: "none" }}
        aria-label="Meilleurs pronos de la soirée"
      >
        {picks.map((pick, index) => (
          <li key={`${pick.userId}-${pick.homeAbbrev}-${pick.awayAbbrev}`} className="shrink-0 snap-start">
            <Link
              href={`/profil/${pick.userId}`}
              prefetch={false}
              className={`flex w-44 flex-col gap-2.5 rounded-2xl border p-3 transition-transform active:scale-[0.98] ${
                pick.isExactScore
                  ? "border-amber-600/50 bg-gradient-to-br from-amber-500/20 via-neutral-900 to-neutral-900"
                  : "border-neutral-800 bg-neutral-900"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="w-4 shrink-0 font-display text-base text-neutral-500">{index + 1}</span>
                <RankAvatar avatarUrl={pick.avatarUrl} username={pick.username} size={28} />
                <span className="min-w-0 truncate text-sm font-semibold text-neutral-100">{pick.username}</span>
              </div>

              <div className="flex items-center justify-center gap-2">
                <TeamBadge abbrev={pick.homeAbbrev} size={26} league={pick.league} />
                <span className="font-display text-2xl leading-none tracking-wide text-neutral-50 tabular-nums">
                  {pick.homeScore}-{pick.awayScore}
                </span>
                <TeamBadge abbrev={pick.awayAbbrev} size={26} league={pick.league} />
              </div>

              <div className="flex items-end justify-between">
                <span className="text-[11px] leading-tight text-neutral-500">
                  {pick.isExactScore ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                      <Target className="h-3 w-3" aria-hidden="true" />
                      Score exact
                    </span>
                  ) : (
                    <>
                      Prono{" "}
                      <span className="font-display text-sm tracking-wide text-neutral-300">
                        {pick.predictedHome}-{pick.predictedAway}
                      </span>
                    </>
                  )}
                </span>
                <span
                  className={`font-display text-2xl leading-none tracking-wide tabular-nums ${
                    pick.isExactScore ? "text-amber-300" : "text-emerald-400"
                  }`}
                >
                  {pick.boosted && (
                    <Flame className="mr-0.5 inline h-3.5 w-3.5 -translate-y-0.5 text-orange-400" aria-label="Boost x2" />
                  )}
                  +{pick.points}
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
