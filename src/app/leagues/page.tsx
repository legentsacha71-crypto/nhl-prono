import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { createLeague, joinLeague } from "./actions";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

export default async function LeaguesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: memberships } = user
    ? await supabase
        .from("league_members")
        .select("leagues(id, name, code)")
        .eq("user_id", user.id)
    : { data: [] };

  type League = { id: string; name: string; code: string };
  const leagues = (memberships ?? [])
    .map((m) => m.leagues as unknown as League)
    .filter((l): l is League => !!l);

  return (
    <div className="min-h-screen p-6 pt-20 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center text-sky-400">
          Mes ligues
        </h1>

        {error && (
          <p className="rounded-md border border-red-900 bg-red-950 p-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {leagues.length === 0 ? (
          <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
            Tu n&apos;es dans aucune ligue pour le moment.
          </p>
        ) : (
          <ul className="space-y-2">
            {leagues.map((league) => (
              <li key={league.id}>
                <Link
                  href={`/leagues/${league.id}`}
                  className="block rounded-lg border border-neutral-800 bg-neutral-900 p-4 hover:bg-neutral-800"
                >
                  <span className="font-medium text-neutral-100">
                    {league.name}
                  </span>
                  <span className="ml-2 text-xs text-neutral-500">
                    {league.code}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="font-medium text-neutral-200">Créer une ligue</h2>
          <form action={createLeague} className="flex gap-2">
            <input
              name="name"
              type="text"
              placeholder="Nom de la ligue"
              required
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-neutral-100 placeholder:text-neutral-500"
            />
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white"
            >
              Créer
            </button>
          </form>
        </div>

        <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
          <h2 className="font-medium text-neutral-200">Rejoindre une ligue</h2>
          <form action={joinLeague} className="flex gap-2">
            <input
              name="code"
              type="text"
              placeholder="Code à 6 caractères"
              required
              maxLength={6}
              className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-neutral-100 uppercase placeholder:text-neutral-500 placeholder:normal-case"
            />
            <button
              type="submit"
              className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white"
            >
              Rejoindre
            </button>
          </form>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
