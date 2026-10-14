import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";
import {
  getLeagueRankingsWithWeekly,
  weekWinners,
  type RankingEntry,
} from "@/lib/ranking";
import { formatWeekRange } from "@/lib/rankingWeek";
import TopBar from "@/components/TopBar";
import { CalendarDays } from "lucide-react";
import { getUnreadCount } from "@/lib/unreadCount";
import RankingBoard from "@/components/RankingBoard";
import LeagueSwitch from "@/components/LeagueSwitch";
import SlidingTabs from "@/components/SlidingTabs";

// Onglets "Général" / "Semaine" d'une compétition : le classement de la
// semaine (lundi-dimanche, heure de Paris) redonne leur chance aux joueurs
// arrivés en cours de saison, et rappelle qui a gagné la semaine dernière.
function CompetitionRanking({
  general,
  week,
  lastWeek,
  weekLabel,
  currentUserId,
}: {
  general: RankingEntry[];
  week: RankingEntry[];
  lastWeek: RankingEntry[];
  weekLabel: string;
  currentUserId?: string;
}) {
  const winners = weekWinners(lastWeek);

  return (
    <SlidingTabs
      tabs={[
        {
          key: "general",
          label: "Général",
          content: (
            <RankingBoard ranking={general} currentUserId={currentUserId} />
          ),
        },
        {
          key: "semaine",
          label: (
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={16} aria-hidden="true" />
              Cette semaine
            </span>
          ),
          content: (
            <div className="space-y-4">
              <p className="text-center text-xs text-neutral-500">
                Points des matchs du {weekLabel}
              </p>
              {winners.length > 0 && (
                <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-center text-sm text-amber-200">
                  🏅 Vainqueur{winners.length > 1 ? "s" : ""} de la semaine
                  dernière :{" "}
                  <span className="font-semibold">
                    {winners.map((w) => w.username).join(", ")}
                  </span>{" "}
                  ({winners[0].totalPoints} pts)
                </p>
              )}
              <RankingBoard
                ranking={week}
                currentUserId={currentUserId}
                emptyMessage="Personne n'a encore marqué de points cette semaine."
              />
            </div>
          ),
        },
      ]}
    />
  );
}

export default async function RankingPage() {
  void getUnreadCount();
  const supabase = await createClient();
  const [user, { general, week, lastWeek, weekBounds }] = await Promise.all([
    getCurrentUser(),
    getLeagueRankingsWithWeekly(supabase),
  ]);
  const weekLabel = formatWeekRange(weekBounds);

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-sky-900/40 bg-gradient-to-br from-sky-600/20 via-neutral-900 to-neutral-950 p-5 text-center shadow-xl shadow-black/30">
          <div className="pointer-events-none absolute -right-6 -top-6 text-8xl opacity-10">
            🏆
          </div>
          <h1 className="text-3xl font-black italic tracking-tight text-neutral-50">
            Le <span className="text-sky-400">classement</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Qui dominera la saison ? 🔥
          </p>
        </div>

        <LeagueSwitch
          nhlContent={
            <CompetitionRanking
              general={general.nhl}
              week={week.nhl}
              lastWeek={lastWeek.nhl}
              weekLabel={weekLabel}
              currentUserId={user?.id}
            />
          }
          magnusContent={
            <CompetitionRanking
              general={general.magnus}
              week={week.magnus}
              lastWeek={lastWeek.magnus}
              weekLabel={weekLabel}
              currentUserId={user?.id}
            />
          }
        />
      </div>
    </div>
  );
}
