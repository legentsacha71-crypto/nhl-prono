import { createClient } from "@/utils/supabase/server";
import { getRanking } from "@/lib/ranking";
import BottomNav from "@/components/BottomNav";

export default async function RankingPage() {
  const supabase = await createClient();
  const ranking = await getRanking(supabase);

  return (
    <div className="min-h-screen p-6 pb-24">
      <div className="mx-auto w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center text-sky-400">
          Classement général
        </h1>

        {ranking.length === 0 ? (
          <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
            Aucun point attribué pour le moment.
          </p>
        ) : (
          <ol className="space-y-2">
            {ranking.map((entry, index) => (
              <li
                key={entry.userId}
                className="flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3"
              >
                <span className="text-neutral-200">
                  <span className="mr-2 text-sm text-neutral-500">
                    {index + 1}
                  </span>
                  {entry.username}
                </span>
                <span className="font-medium text-sky-400">
                  {entry.totalPoints} pts
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
