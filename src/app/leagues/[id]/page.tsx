import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";
import { getMembersRankings } from "@/lib/ranking";
import { formatWeekRange, parisWeekBounds } from "@/lib/rankingWeek";
import { loadMessages } from "@/lib/leagueChat";
import TopBar from "@/components/TopBar";
import { getUnreadCount } from "@/lib/unreadCount";
import RankingBoard from "@/components/RankingBoard";
import StandingsViews from "@/components/StandingsViews";
import InviteButton from "@/components/InviteButton";
import LeagueTabs from "@/components/LeagueTabs";

export default async function LeagueDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  void getUnreadCount();
  const [{ id }, { tab }] = await Promise.all([params, searchParams]);
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  // La ligue, ses membres et son chat ne dépendent que de l'id : en
  // parallèle. Le chat n'est lisible que par les membres (vérifié après).
  const [{ data: league }, { data: members }, messages] = await Promise.all([
    supabase.from("leagues").select("id, name, code").eq("id", id).single(),
    supabase.from("league_members").select("user_id").eq("league_id", id),
    loadMessages(supabase, id),
  ]);

  const memberIds = (members ?? []).map((m) => m.user_id as string);
  if (!league || !memberIds.includes(user.id)) notFound();

  const now = new Date();
  const { general, week } = await getMembersRankings(supabase, memberIds, now);
  const lastOtherMessageAt =
    [...messages].reverse().find((m) => m.userId !== user.id)?.createdAt ?? null;
  const alone = memberIds.length === 1;

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="relative overflow-hidden rounded-2xl border border-sky-900/40 bg-gradient-to-br from-sky-600/20 via-neutral-900 to-neutral-950 p-5 shadow-xl shadow-black/30">
          <Link
            href="/leagues"
            className="inline-flex items-center gap-0.5 text-xs font-medium text-sky-400 transition-opacity active:opacity-70"
          >
            <ChevronLeft size={14} aria-hidden="true" />
            Mes ligues
          </Link>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-black italic tracking-tight text-neutral-50">
                {league.name}
              </h1>
              <p className="mt-0.5 text-sm text-neutral-400">
                {memberIds.length} joueur{memberIds.length > 1 ? "s" : ""} · code{" "}
                <span className="font-mono tracking-wider text-neutral-200">{league.code}</span>
              </p>
            </div>
            <InviteButton name={league.name} code={league.code} />
          </div>
        </div>

        <LeagueTabs
          initialTab={tab === "chat" ? "chat" : "classement"}
          leagueId={league.id}
          currentUserId={user.id}
          initialMessages={messages}
          lastOtherMessageAt={lastOtherMessageAt}
          ranking={
            <div className="space-y-4">
              {alone && (
                <p className="rounded-xl border border-dashed border-sky-800/60 bg-sky-950/30 p-3 text-center text-sm text-sky-200">
                  Tu es seul dans cette ligue pour l&apos;instant. Appuie sur Inviter pour défier tes amis.
                </p>
              )}
              <StandingsViews
                views={[
                  {
                    key: "general",
                    label: "Général",
                    content: <RankingBoard ranking={general} currentUserId={user.id} />,
                  },
                  {
                    key: "semaine",
                    label: "Cette semaine",
                    content: (
                      <div className="space-y-4">
                        <p className="text-center text-xs text-neutral-500">
                          Points des matchs du {formatWeekRange(parisWeekBounds(now))}
                        </p>
                        <RankingBoard
                          ranking={week}
                          currentUserId={user.id}
                          emptyMessage="Personne n'a encore marqué de points cette semaine."
                        />
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          }
        />
      </div>
    </div>
  );
}
