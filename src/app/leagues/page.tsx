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

  const memberCounts = await Promise.all(
    leagues.map((league) =>
      supabase
        .from("league_members")
        .select("user_id", { count: "exact", head: true })
        .eq("league_id", league.id)
        .then(({ count }) => [league.id, count ?? 0] as const),
    ),
  );
  const memberCountByLeague = new Map(memberCounts);

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
          <p className="rounded-md border border-red-900 bg-red-950 p-3 text-sm text-red-400">
            {error}
          </p>
        )}

        {leagues.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-700 bg-neutral-900 p-6 text-center text-sm text-neutral-400">
            🥅 Tu n&apos;es dans aucune ligue pour le moment.
            <br />
            Crée-en une ou rejoins celle de tes amis !
          </p>
        ) : (
          <ul className="space-y-3">
            {leagues.map((league) => {
              const memberCount = memberCountByLeague.get(league.id) ?? 0;
              return (
                <li key={league.id}>
                  <Link
                    href={`/leagues/${league.id}`}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-neutral-800 bg-gradient-to-r from-neutral-900 to-neutral-900 p-4 shadow-lg shadow-black/20 transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-700/60 hover:shadow-sky-950/30"
                  >
                    <span className="absolute inset-y-0 left-0 w-1 bg-gradient-to-b from-sky-400 to-sky-600" />
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-500/10 text-xl ring-1 ring-sky-500/30">
                      🏒
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-bold text-neutral-100">
                        {league.name}
                      </span>
                      <span className="mt-0.5 flex items-center gap-2 text-xs text-neutral-500">
                        <span className="rounded bg-neutral-800 px-1.5 py-0.5 font-mono tracking-wider text-neutral-300">
                          {league.code}
                        </span>
                        <span>
                          👥 {memberCount} membre{memberCount > 1 ? "s" : ""}
                        </span>
                      </span>
                    </span>
                    <span className="text-neutral-600 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-sky-400">
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2 rounded-xl border border-sky-900/40 bg-gradient-to-br from-sky-500/10 to-neutral-900 p-4 shadow-lg shadow-black/20">
            <h2 className="flex items-center gap-1.5 font-bold text-neutral-100">
              🏗️ Créer ta ligue
            </h2>
            <form action={createLeague} className="flex gap-2">
              <input
                name="name"
                type="text"
                placeholder="Nom de la ligue"
                required
                className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
              />
              <button
                type="submit"
                className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-sky-950/40 transition-all duration-150 hover:bg-sky-500 active:scale-[0.97]"
              >
                Créer
              </button>
            </form>
          </div>

          <div className="space-y-2 rounded-xl border border-amber-900/40 bg-gradient-to-br from-amber-500/10 to-neutral-900 p-4 shadow-lg shadow-black/20">
            <h2 className="flex items-center gap-1.5 font-bold text-neutral-100">
              🎟️ Rejoindre une ligue
            </h2>
            <form action={joinLeague} className="flex gap-2">
              <input
                name="code"
                type="text"
                placeholder="Code à 6 caractères"
                required
                maxLength={6}
                className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-100 uppercase placeholder:text-neutral-500 placeholder:normal-case transition-colors focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
              />
              <button
                type="submit"
                className="rounded-md bg-amber-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-amber-950/40 transition-all duration-150 hover:bg-amber-500 active:scale-[0.97]"
              >
                Rejoindre
              </button>
            </form>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
