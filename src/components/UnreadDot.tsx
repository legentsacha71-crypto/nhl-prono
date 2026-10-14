"use client";

import { useSyncExternalStore } from "react";
import { getSeenSnapshot, isUnread, subscribeSeen } from "@/lib/chatSeen";

// Pastille bleue quand le chat d'une ligue a un message pas encore vu sur
// cet appareil (voir chatSeen.ts).
export default function UnreadDot({
  leagueId,
  lastAt,
  className = "",
}: {
  leagueId: string;
  lastAt: string | null;
  className?: string;
}) {
  const snapshot = useSyncExternalStore(subscribeSeen, getSeenSnapshot, () => null);
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!hydrated || !isUnread(snapshot, leagueId, lastAt)) return null;
  return (
    <span
      aria-label="Nouveaux messages"
      className={`inline-block h-2 w-2 shrink-0 rounded-full bg-sky-400 ${className}`}
    />
  );
}
