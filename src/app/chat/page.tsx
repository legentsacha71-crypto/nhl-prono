import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

export default async function ChatPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: memberships } = await supabase
    .from("league_members")
    .select("leagues(id, name)")
    .eq("user_id", user.id);

  type League = { id: string; name: string };
  const leagues = (memberships ?? [])
    .map((m) => m.leagues as unknown as League)
    .filter((l): l is League => !!l);

  if (leagues.length === 1) {
    redirect(`/leagues/${leagues[0].id}/chat`);
  }

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-center text-sky-400">Chat</h1>

        {leagues.length === 0 ? (
          <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
            Rejoins ou crée une ligue pour discuter avec tes amis.{" "}
            <Link href="/leagues" className="text-sky-400">
              Mes ligues
            </Link>
          </p>
        ) : (
          <ul className="space-y-2">
            {leagues.map((league) => (
              <li key={league.id}>
                <Link
                  href={`/leagues/${league.id}/chat`}
                  className="block rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:bg-neutral-800"
                >
                  <span className="font-medium text-neutral-100">
                    {league.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
