"use client";

import { useState, type ReactNode } from "react";
import LeagueChat from "@/components/LeagueChat";
import UnreadDot from "@/components/UnreadDot";
import type { ChatMessage } from "@/lib/leagueChat";

export type LeagueTab = "classement" | "chat";

// Onglets Classement / Chat d'une ligue. L'onglet choisi est reporté dans
// l'URL (?tab=chat) pour qu'un lien ou un retour arrière y ramène.
export default function LeagueTabs({
  initialTab,
  ranking,
  leagueId,
  currentUserId,
  initialMessages,
  lastOtherMessageAt,
}: {
  initialTab: LeagueTab;
  ranking: ReactNode;
  leagueId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  lastOtherMessageAt: string | null;
}) {
  const [tab, setTab] = useState<LeagueTab>(initialTab);

  function select(next: LeagueTab) {
    if (next === tab) return;
    setTab(next);
    const url = new URL(window.location.href);
    if (next === "chat") url.searchParams.set("tab", "chat");
    else url.searchParams.delete("tab");
    window.history.replaceState(window.history.state, "", url);
    if (next === "classement") window.scrollTo({ top: 0 });
  }

  const tabs: { key: LeagueTab; label: string }[] = [
    { key: "classement", label: "Classement" },
    { key: "chat", label: "Chat" },
  ];

  return (
    <div className="space-y-4">
      <div role="tablist" className="flex rounded-full border border-neutral-800 bg-neutral-900 p-1">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => select(key)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-sm font-semibold transition-colors ${
              tab === key ? "bg-neutral-100 text-neutral-900" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {label}
            {key === "chat" && tab !== "chat" && <UnreadDot leagueId={leagueId} lastAt={lastOtherMessageAt} />}
          </button>
        ))}
      </div>

      <div role="tabpanel" hidden={tab !== "classement"}>
        {ranking}
      </div>
      <div role="tabpanel" hidden={tab !== "chat"}>
        <LeagueChat
          leagueId={leagueId}
          currentUserId={currentUserId}
          initialMessages={initialMessages}
          active={tab === "chat"}
        />
      </div>
    </div>
  );
}
