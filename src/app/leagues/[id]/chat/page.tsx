import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { sendMessage } from "./actions";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function LeagueChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name")
    .eq("id", id)
    .single();

  if (!league) notFound();

  const { data: membership } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) notFound();

  const { data: messages } = await supabase
    .from("league_messages")
    .select("id, body, created_at, user_id, profiles(username)")
    .eq("league_id", id)
    .order("created_at", { ascending: true })
    .limit(50);

  type Message = {
    id: string;
    body: string;
    created_at: string;
    user_id: string;
    profiles: { username: string } | null;
  };
  const list = (messages ?? []) as unknown as Message[];

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-center text-sky-400">
            {league.name}
          </h1>
          <p className="text-center text-sm">
            <Link href={`/leagues/${id}`} className="text-sky-400">
              Retour à la ligue
            </Link>
          </p>
        </div>

        <div className="space-y-2 rounded-lg border border-neutral-800 bg-neutral-900 p-3">
          {list.length === 0 ? (
            <p className="p-4 text-center text-sm text-neutral-400">
              Aucun message pour le moment.
            </p>
          ) : (
            list.map((m) => (
              <div
                key={m.id}
                className={`rounded-md p-2 text-sm ${
                  m.user_id === user.id
                    ? "ml-6 bg-sky-950 text-sky-100"
                    : "mr-6 bg-neutral-800 text-neutral-200"
                }`}
              >
                <p className="mb-0.5 text-xs font-medium text-neutral-400">
                  {m.profiles?.username ?? "?"} · {formatTime(m.created_at)}
                </p>
                <p>{m.body}</p>
              </div>
            ))
          )}
        </div>

        <form action={sendMessage} className="flex gap-2">
          <input type="hidden" name="leagueId" value={id} />
          <input
            name="body"
            type="text"
            placeholder="Écrire un message…"
            required
            maxLength={500}
            className="flex-1 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-neutral-100 placeholder:text-neutral-500"
          />
          <button
            type="submit"
            className="rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white"
          >
            Envoyer
          </button>
        </form>
      </div>

      <BottomNav />
    </div>
  );
}
