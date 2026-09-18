import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { getLeagueRankings, type RankingEntry } from "@/lib/ranking";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import RankAvatar from "@/components/RankAvatar";
import LeagueSwitch from "@/components/LeagueSwitch";

// Style du podium des 3 premiers : placement explicite en grille (colonne
// 2 = 1er, 1 = 2e, 3 = 3e) plutôt que l'ordre du tableau, pour garder le 1er
// au centre et en hauteur — motif classique "podium" des apps sportives —
// sans changer l'ordre logique des données (toujours 1er/2e/3e dans
// `ranking`). Les 3 colonnes sont de largeur strictement égale, donc le
// podium reste symétrique quelle que soit la longueur des pseudos.
const PODIUM_STYLES = [
  {
    place: "col-start-2 row-start-1",
    height: "min-h-44",
    avatarSize: 72,
    medal: "🥇",
    card: "border-amber-500/50 bg-gradient-to-b from-amber-500/20 to-neutral-900 shadow-lg shadow-amber-950/30",
    label: "text-amber-400",
  },
  {
    place: "col-start-1 row-start-1",
    height: "min-h-36",
    avatarSize: 60,
    medal: "🥈",
    card: "border-neutral-400/40 bg-gradient-to-b from-neutral-400/15 to-neutral-900 shadow-lg shadow-black/20",
    label: "text-neutral-300",
  },
  {
    place: "col-start-3 row-start-1",
    height: "min-h-32",
    avatarSize: 56,
    medal: "🥉",
    card: "border-orange-700/50 bg-gradient-to-b from-orange-700/15 to-neutral-900 shadow-lg shadow-black/20",
    label: "text-orange-400",
  },
];

// Un seul classement (podium + liste), réutilisé pour NHL et Ligue Magnus :
// même composant, juste alimenté par des données différentes, pour garantir
// que les deux ligues aient toujours un rendu identique.
function RankingBoard({
  ranking,
  currentUserId,
}: {
  ranking: RankingEntry[];
  currentUserId?: string;
}) {
  if (ranking.length === 0) {
    return (
      <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
        Aucun point attribué pour le moment.
      </p>
    );
  }

  const podium = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div className="space-y-4">
      {podium.length > 0 && (
        <div className="grid grid-cols-3 items-end gap-3">
          {podium.map((entry, index) => {
            const style = PODIUM_STYLES[index];
            const isMe = entry.userId === currentUserId;
            return (
              <Link
                key={entry.userId}
                href={`/profil/${entry.userId}`}
                className={`flex ${style.place} ${style.height} min-w-0 flex-col items-center justify-end gap-1.5 rounded-2xl border px-2 pb-3 pt-6 transition-transform duration-200 hover:scale-[1.02] ${style.card} ${
                  isMe ? "ring-1 ring-sky-500/50" : ""
                }`}
              >
                <span className="text-2xl leading-none">{style.medal}</span>
                <RankAvatar
                  avatarUrl={entry.avatarUrl}
                  username={entry.username}
                  points={entry.totalPoints}
                  size={style.avatarSize}
                />
                <span className="max-w-full truncate text-sm font-semibold text-white">
                  {entry.username}
                </span>
                <span
                  className={`font-display text-xl leading-none tracking-wide ${style.label}`}
                >
                  {entry.totalPoints}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      {rest.length > 0 && (
        <ol className="space-y-2">
          {rest.map((entry, index) => {
            const rank = index + 4;
            const isMe = entry.userId === currentUserId;
            return (
              <li
                key={entry.userId}
                className={`flex items-center justify-between rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-sm shadow-black/20 transition-colors duration-150 ${
                  isMe ? "ring-1 ring-sky-500/50" : ""
                }`}
              >
                <Link
                  href={`/profil/${entry.userId}`}
                  className="flex items-center text-neutral-200 transition-colors duration-150 hover:text-sky-400"
                >
                  <span className="mr-2 w-6 text-center font-display text-base text-neutral-500">
                    {rank}
                  </span>
                  <RankAvatar
                    avatarUrl={entry.avatarUrl}
                    username={entry.username}
                  />
                  <span className="ml-2">{entry.username}</span>
                  {isMe && (
                    <span className="ml-2 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                      Toi
                    </span>
                  )}
                </Link>
                <span className="font-display text-lg tracking-wide text-sky-400">
                  {entry.totalPoints} pts
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

export default async function RankingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { nhl, magnus } = await getLeagueRankings(supabase);

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-sky-900/40 bg-gradient-to-br from-sky-600/20 via-neutral-900 to-neutral-950 p-5 text-center shadow-xl shadow-black/30">
          <div className="pointer-events-none absolute -right-6 -top-6 text-8xl opacity-10">
            🏆
          </div>
          <h1 className="text-3xl font-black italic tracking-tight text-neutral-50">
            Le <span className="text-sky-400">classement</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Qui dominera la saison ? 🔥
          </p>
        </div>

        <LeagueSwitch
          nhlContent={<RankingBoard ranking={nhl} currentUserId={user?.id} />}
          magnusContent={
            <RankingBoard ranking={magnus} currentUserId={user?.id} />
          }
        />
      </div>
      <BottomNav />
    </div>
  );
}
