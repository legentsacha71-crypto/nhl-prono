import { createClient } from "@/utils/supabase/server";
import { getRanking } from "@/lib/ranking";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";

const MEDALS = ["🥇", "🥈", "🥉"];

const RANK_STYLES = [
  "border-amber-500/40 bg-gradient-to-r from-amber-500/10 to-neutral-900 shadow-lg shadow-amber-950/20",
  "border-neutral-400/30 bg-gradient-to-r from-neutral-400/10 to-neutral-900 shadow-lg shadow-black/20",
  "border-orange-700/40 bg-gradient-to-r from-orange-700/10 to-neutral-900 shadow-lg shadow-black/20",
];

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const ranking = await getRanking(supabase);

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
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
            {ranking.map((entry, index) => {
              const isMe = entry.userId === user?.id;
              return (
                <li
                  key={entry.userId}
                  className={`flex items-center justify-between rounded-lg border p-3 transition-colors duration-150 ${
                    RANK_STYLES[index] ??
                    "border-neutral-800 bg-neutral-900 shadow-sm shadow-black/20"
                  } ${isMe ? "ring-1 ring-sky-500/50" : ""}`}
                >
                  <span className="flex items-center text-neutral-200">
                    <span className="mr-2 w-5 text-center text-sm text-neutral-500">
                      {MEDALS[index] ?? index + 1}
                    </span>
                    {entry.username}
                    {isMe && (
                      <span className="ml-2 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                        Toi
                      </span>
                    )}
                  </span>
                  <span className="font-medium text-sky-400">
                    {entry.totalPoints} pts
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
