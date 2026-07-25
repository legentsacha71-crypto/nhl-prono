"use client";

import { useEffect, useRef, useState } from "react";
import PlayerStatsSummary, {
  type PlayerStats,
} from "@/components/PlayerStatsSummary";

export type ProfileStatsData = PlayerStats;

// Pas d'infra realtime (websocket) dans ce projet : on simule le "live" par
// un polling léger de /api/profile-stats, mis en pause quand l'onglet/app
// n'est pas au premier plan. Suffisant à cette échelle (quelques dizaines
// d'utilisateurs) et beaucoup plus simple que d'activer Supabase Realtime.
// Note : ce endpoint ne renvoie que les stats de l'utilisateur connecté (via
// son cookie de session) — ce composant ne sert donc que pour SON PROPRE
// profil. Pour voir les stats d'un autre joueur, voir PlayerStatsSummary
// utilisé directement (statique, sans polling) dans profil/[id]/page.tsx.
const REFRESH_INTERVAL_MS = 25_000;

export default function ProfileStatsPanel({
  initial,
}: {
  initial: ProfileStatsData;
}) {
  const [stats, setStats] = useState(initial);
  const [pulse, setPulse] = useState(false);
  const prevPoints = useRef(initial.points);
  const pulseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/profile-stats", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: ProfileStatsData = await res.json();
        if (cancelled) return;

        setStats(data);
        if (data.points !== prevPoints.current) {
          prevPoints.current = data.points;
          setPulse(true);
          if (pulseTimeout.current) clearTimeout(pulseTimeout.current);
          pulseTimeout.current = setTimeout(() => {
            if (!cancelled) setPulse(false);
          }, 900);
        }
      } catch {
        // Silencieux : on garde les dernières stats connues et on
        // réessaiera au prochain intervalle.
      }
    }

    const interval = setInterval(refresh, REFRESH_INTERVAL_MS);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (pulseTimeout.current) clearTimeout(pulseTimeout.current);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  return <PlayerStatsSummary stats={stats} live pulse={pulse} />;
}
