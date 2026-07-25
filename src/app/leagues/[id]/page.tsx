import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getRanking } from "@/lib/ranking";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import RankAvatar from "@/components/RankAvatar";

export default async function LeagueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: league } = await supabase
    .from("leagues")
    .select("id, name, code")
    .eq("id", id)
    .single();

  if (!league) notFound();

  const { data: members } = await supabase
    .from("league_members")
    .select("user_id")
    .eq("league_id", id);

  const memberIds = (members ?? []).map((m) => m.user_id as string);
  const ranking = await getRanking(supabase, memberIds);

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-center text-sky-400">
            {league.name}
          </h1>
          <p className="mt-1 text-center text-sm text-neutral-500">
            Code d&apos;invitation :{" "}
            <span className="font-mono text-neutral-300">{league.code}</span>
          </p>
        </div>

        <ol className="space-y-2">
          {ranking.map((entry, index) => (
            <li
              key={entry.userId}
              className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3"
            >
              <Link
                href={`/profil/${entry.userId}`}
                className="flex items-center text-neutral-200 transition-colors duration-150 hover:text-sky-400"
              >
                <span className="mr-2 text-sm text-neutral-500">
                  {index + 1}
                </span>
                <RankAvatar
                  avatarUrl={entry.avatarUrl}
                  username={entry.username}
                />
                <span className="ml-2">{entry.username}</span>
              </Link>
              <span className="font-medium text-sky-400">
                {entry.totalPoints} pts
              </span>
            </li>
          ))}
        </ol>

        <p className="text-center">
          <Link href="/leagues" className="text-sm text-sky-400">
            Retour à mes ligues
          </Link>
        </p>
      </div>

      <BottomNav />
    </div>
  );
}
