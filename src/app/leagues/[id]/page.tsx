import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getRanking } from "@/lib/ranking";

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
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-center">{league.name}</h1>
          <p className="mt-1 text-center text-sm text-gray-500">
            Code d&apos;invitation : <span className="font-mono">{league.code}</span>
          </p>
        </div>

        <ol className="space-y-2">
          {ranking.map((entry, index) => (
            <li
              key={entry.userId}
              className="flex items-center justify-between rounded-md border border-gray-200 p-3"
            >
              <span>
                <span className="mr-2 text-sm text-gray-400">{index + 1}</span>
                {entry.username}
              </span>
              <span className="font-medium">{entry.totalPoints} pts</span>
            </li>
          ))}
        </ol>

        <p className="text-center">
          <Link href="/leagues" className="text-sm text-blue-600">
            Retour à mes ligues
          </Link>
        </p>
      </div>
    </div>
  );
}
