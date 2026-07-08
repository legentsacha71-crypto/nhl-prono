import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getRegularSeasonStartDate } from "@/lib/nhl";
import { signout } from "./login/actions";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import SeasonCountdown from "@/components/SeasonCountdown";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single()
    : { data: null };

  const seasonStartDate = await getRegularSeasonStartDate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 pt-20 pb-24">
      <TopBar />
      <div className="text-center">
        <img
          src="/logo-la-nuit-nhl.png"
          alt="La Nuit NHL"
          className="mx-auto h-24 w-auto"
        />
        <p className="mt-2 text-neutral-400">
          Content de te revoir, {profile?.username ?? user?.email}
        </p>
      </div>

      {seasonStartDate && <SeasonCountdown targetDate={seasonStartDate} />}

      <div className="grid w-full max-w-md grid-cols-2 gap-3">
        <Link
          href="/chat"
          className="flex flex-col items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:bg-neutral-800"
        >
          <span className="text-2xl">💬</span>
          <span className="text-sm font-medium text-neutral-200">
            Chat avec tes amis
          </span>
        </Link>
        <Link
          href="/notifications"
          className="flex flex-col items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:bg-neutral-800"
        >
          <span className="text-2xl">🔔</span>
          <span className="text-sm font-medium text-neutral-200">
            Notifications
          </span>
        </Link>
      </div>

      <form action={signout}>
        <button className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300">
          Se déconnecter
        </button>
      </form>

      <BottomNav />
    </div>
  );
}
