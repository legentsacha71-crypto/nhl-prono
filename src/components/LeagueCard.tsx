import Link from "next/link";
import { ChevronRight } from "lucide-react";
import UnreadDot from "@/components/UnreadDot";
import { messagePreview } from "@/lib/leagueChat";
import type { MyLeague } from "@/lib/myLeagues";

function rankLabel(rank: number) {
  return rank === 1 ? "1er" : `${rank}e`;
}

// Carte d'une ligue : sa place et le leader, puis le dernier message du chat.
export default function LeagueCard({ league, href, currentUserId }: { league: MyLeague; href: string; currentUserId: string }) {
  const { memberCount, myRank, leader, lastMessage } = league;
  const standing =
    memberCount <= 1
      ? "Seul pour l'instant · invite tes amis"
      : leader?.userId === currentUserId
        ? `1er sur ${memberCount} · Tu mènes 🔥`
        : `${rankLabel(myRank)} sur ${memberCount} · Leader : ${leader?.username ?? "?"}`;

  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition-colors active:bg-neutral-800/80"
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-xl ring-1 ${
          memberCount > 1 && myRank === 1
            ? "bg-amber-400/15 text-amber-300 ring-amber-400/40"
            : "bg-sky-500/10 text-sky-300 ring-sky-500/30"
        }`}
      >
        {memberCount > 1 ? myRank : "🏒"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-bold text-neutral-100">{league.name}</span>
          <UnreadDot leagueId={league.id} lastAt={lastMessage?.createdAt ?? null} />
        </span>
        <span className="mt-0.5 block truncate text-xs text-neutral-400">{standing}</span>
        {lastMessage && (
          <span className="mt-1 block truncate text-xs text-neutral-500">{messagePreview(lastMessage)}</span>
        )}
      </span>
      <ChevronRight
        size={18}
        className="shrink-0 text-neutral-600 transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </Link>
  );
}
