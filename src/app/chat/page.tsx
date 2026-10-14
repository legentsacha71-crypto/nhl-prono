import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";
import TopBar from "@/components/TopBar";
import { getUnreadCount } from "@/lib/unreadCount";
import { getMyLeagues } from "@/lib/myLeagues";
import LeagueCard from "@/components/LeagueCard";

// Icône chat du haut : les ligues du joueur avec leur dernier message ; une
// seule ligue = son chat directement.
export default async function ChatPage() {
  void getUnreadCount();
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const leagues = await getMyLeagues(supabase, user.id);
  if (leagues.length === 1) redirect(`/leagues/${leagues[0].id}?tab=chat`);

  // Les ligues où l'on a parlé en dernier d'abord.
  const sorted = [...leagues].sort(
    (a, b) =>
      Date.parse(b.lastMessage?.createdAt ?? "1970-01-01") -
      Date.parse(a.lastMessage?.createdAt ?? "1970-01-01"),
  );

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-sky-900/40 bg-gradient-to-br from-sky-600/20 via-neutral-900 to-neutral-950 p-5 text-center shadow-xl shadow-black/30">
          <div className="pointer-events-none absolute -right-6 -top-6 text-8xl opacity-10">💬</div>
          <h1 className="text-3xl font-black italic tracking-tight text-neutral-50">
            Le <span className="text-sky-400">chat</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-400">Chambre tes amis de ligue 😏</p>
        </div>

        {sorted.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900 p-6 text-center text-sm text-neutral-400">
            Rejoins ou crée une ligue pour discuter avec tes amis.{" "}
            <Link href="/leagues" className="text-sky-400">
              Mes ligues
            </Link>
          </p>
        ) : (
          <ul className="space-y-3">
            {sorted.map((league) => (
              <li key={league.id}>
                <LeagueCard league={league} href={`/leagues/${league.id}?tab=chat`} currentUserId={user.id} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
