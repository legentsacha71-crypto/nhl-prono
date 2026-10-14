import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";
import TopBar from "@/components/TopBar";
import { getUnreadCount } from "@/lib/unreadCount";
import { getMyLeagues } from "@/lib/myLeagues";
import LeagueCard from "@/components/LeagueCard";
import LeagueForms from "@/components/LeagueForms";

export default async function LeaguesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  void getUnreadCount();
  const { error } = await searchParams;

  const supabase = await createClient();
  const user = await getCurrentUser();
  const leagues = user ? await getMyLeagues(supabase, user.id) : [];

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-sky-900/40 bg-gradient-to-br from-sky-600/20 via-neutral-900 to-neutral-950 p-5 text-center shadow-xl shadow-black/30">
          <div className="pointer-events-none absolute -right-6 -top-6 text-8xl opacity-10">
            🏒
          </div>
          <h1 className="text-3xl font-black italic tracking-tight text-neutral-50">
            Mes <span className="text-sky-400">ligues</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Défie tes amis, grimpe au sommet du classement 🏆
          </p>
        </div>

        {error && (
          <p className="rounded-xl border border-red-900 bg-red-950 p-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {leagues.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900 p-6 text-center text-sm text-neutral-400">
            🥅 Tu n&apos;es dans aucune ligue pour le moment.
            <br />
            Crée la tienne ou rejoins celle de tes amis avec leur code.
          </p>
        ) : (
          <ul className="space-y-3">
            {leagues.map((league) => (
              <li key={league.id}>
                <LeagueCard league={league} href={`/leagues/${league.id}`} currentUserId={user!.id} />
              </li>
            ))}
          </ul>
        )}

        <LeagueForms />
      </div>
    </div>
  );
}
