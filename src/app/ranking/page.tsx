import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getRanking } from "@/lib/ranking";

export default async function RankingPage() {
  const supabase = await createClient();
  const ranking = await getRanking(supabase);

  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">Classement général</h1>

        {ranking.length === 0 ? (
          <p className="rounded-md bg-gray-100 p-4 text-center text-sm text-gray-600">
            Aucun point attribué pour le moment.
          </p>
        ) : (
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
        )}

        <p className="text-center">
          <Link href="/leagues" className="text-sm text-blue-600">
            Voir mes ligues
          </Link>
        </p>
      </div>
    </div>
  );
}
