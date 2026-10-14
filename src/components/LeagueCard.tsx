import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import UnreadDot from "@/components/UnreadDot";
import { messagePreview } from "@/lib/leagueChat";
import type { MyLeague } from "@/lib/myLeagues";

function rankLabel(rank: number) {
  return rank === 1 ? "1er" : `${rank}e`;
}

const COMPETITION = {
  nhl: { logo: "/logos/nhl.png", label: "NHL" },
  magnus: { logo: "/logos/magnus.png", label: "Magnus" },
} as const;

// Carte d'une ligue : la compétition où le joueur y joue (logo), sa place et
// le leader, puis le dernier message du chat.
export default function LeagueCard({ league, href, currentUserId }: { league: MyLeague; href: string; currentUserId: string }) {
  const { memberCount, playerCount, myRank, leader, lastMessage } = league;
  const competition = COMPETITION[league.competition];
  const ranked = memberCount > 1 && myRank > 0 && playerCount > 1;
  // Ligue toute neuve : tout le monde à 0, pas encore de leader.
  const fresh = ranked && (leader?.points ?? 0) === 0;
  const standing =
    memberCount <= 1
      ? "Seul pour l'instant · invite tes amis"
      : !ranked
        ? `${memberCount} joueurs${leader ? ` · Leader : ${leader.username}` : ""}`
        : fresh
          ? "Tout le monde à 0, c'est parti !"
          : leader?.userId === currentUserId
            ? `1er sur ${playerCount} · Tu mènes 🔥`
            : `${rankLabel(myRank)} sur ${playerCount} · Leader : ${leader?.username ?? "?"}`;

  return (
    <Link
      href={href}
      prefetch={false}
      className="group flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 p-4 transition-colors active:bg-neutral-800/80"
    >
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-display text-xl ring-1 ${
          ranked && !fresh && myRank === 1
            ? "bg-amber-400/15 text-amber-300 ring-amber-400/40"
            : "bg-sky-500/10 text-sky-300 ring-sky-500/30"
        }`}
      >
        {ranked && !fresh ? myRank : "🏒"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-bold text-neutral-100">{league.name}</span>
          <UnreadDot leagueId={league.id} lastAt={lastMessage?.createdAt ?? null} />
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-neutral-400">
          {memberCount > 1 && (
            <Image
              src={competition.logo}
              alt={competition.label}
              width={14}
              height={14}
              className="h-3.5 w-3.5 shrink-0 object-contain"
            />
          )}
          <span className="truncate">{standing}</span>
        </span>
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
