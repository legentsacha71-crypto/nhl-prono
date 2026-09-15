import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getRegularSeasonStartDate } from "@/lib/nhl";
import { getRanking } from "@/lib/ranking";
import { isMagnusGameId } from "@/lib/competition";
import { signout } from "./login/actions";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import SeasonCountdown from "@/components/SeasonCountdown";
import Logo from "@/components/Logo";
import RulesCard from "@/components/RulesCard";
import SubmitButton from "@/components/SubmitButton";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Le classement (points globaux, qui incluent aussi les picks Coupe
  // Stanley / meilleur buteur) et la ventilation NHL / Magnus des
  // pronostics ne dépendent que de l'utilisateur, pas l'un de l'autre :
  // lancés en parallèle. Même logique de ventilation que la page profil
  // (voir isMagnusGameId).
  const [{ data: profile }, ranking, { data: predictions }] =
    await Promise.all([
      user
        ? supabase
            .from("profiles")
            .select("username")
            .eq("id", user.id)
            .single()
        : Promise.resolve({ data: null }),
      user ? getRanking(supabase) : Promise.resolve([]),
      user
        ? supabase
            .from("predictions")
            .select("game_id, points")
            .eq("user_id", user.id)
            .not("points", "is", null)
        : Promise.resolve({ data: [] }),
    ]);

  const totalPoints = user
    ? (ranking.find((entry) => entry.userId === user.id)?.totalPoints ?? 0)
    : 0;
  const nhlPoints = (predictions ?? [])
    .filter((p) => !isMagnusGameId(p.game_id))
    .reduce((sum, p) => sum + (p.points ?? 0), 0);
  const magnusPoints = (predictions ?? [])
    .filter((p) => isMagnusGameId(p.game_id))
    .reduce((sum, p) => sum + (p.points ?? 0), 0);

  const seasonStartDate = await getRegularSeasonStartDate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 pt-28 pb-24">
      <TopBar />
      <div className="text-center">
        <Logo size="lg" className="justify-center" />
        <p className="mt-2 text-neutral-400">
          Content de te revoir, {profile?.username ?? user?.email}
        </p>
      </div>

      {user && (
        <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-md shadow-black/20">
          <div className="grid grid-cols-3 divide-x divide-neutral-800 text-center">
            <div>
              <p className="font-display text-2xl text-sky-400">
                {totalPoints}
              </p>
              <p className="text-xs text-neutral-500">Total</p>
            </div>
            <div>
              <p className="font-display text-2xl text-neutral-100">
                {nhlPoints}
              </p>
              <p className="text-xs text-neutral-500">NHL</p>
            </div>
            <div>
              <p className="font-display text-2xl text-neutral-100">
                {magnusPoints}
              </p>
              <p className="text-xs text-neutral-500">Magnus</p>
            </div>
          </div>
        </div>
      )}

      {seasonStartDate && <SeasonCountdown targetDate={seasonStartDate} />}

      <RulesCard />

      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <Link
          href="/chat"
          className="flex flex-col items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-md shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-800/60 hover:bg-neutral-800 hover:shadow-lg active:translate-y-0"
        >
          <span className="text-2xl">💬</span>
          <span className="text-sm font-medium text-neutral-200">
            Chat avec tes amis
          </span>
        </Link>
        <Link
          href="/notifications"
          className="flex flex-col items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 p-4 shadow-md shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-800/60 hover:bg-neutral-800 hover:shadow-lg active:translate-y-0"
        >
          <span className="text-2xl">🔔</span>
          <span className="text-sm font-medium text-neutral-200">
            Notifications
          </span>
        </Link>
      </div>

      <form action={signout}>
        <SubmitButton className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300 transition-all duration-150 hover:border-neutral-600 hover:bg-neutral-900 hover:text-neutral-100 active:scale-[0.97]">
          Se déconnecter
        </SubmitButton>
      </form>

      <BottomNav />
    </div>
  );
}
