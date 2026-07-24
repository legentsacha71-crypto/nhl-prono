"use client";

import { useEffect, useRef, useState } from "react";

export type ProfileStatsData = {
  points: number;
  rank: number;
  totalRanked: number;
  pronosCount: number;
  gradedCount: number;
  correctCount: number;
  exactCount: number;
};

// Pas d'infra realtime (websocket) dans ce projet : on simule le "live" par
// un polling léger de /api/profile-stats, mis en pause quand l'onglet/app
// n'est pas au premier plan. Suffisant à cette échelle (quelques dizaines
// d'utilisateurs) et beaucoup plus simple que d'activer Supabase Realtime.
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

  const successRate = stats.gradedCount
    ? Math.round((stats.correctCount / stats.gradedCount) * 100)
    : 0;
  const exactRate = stats.gradedCount
    ? Math.round((stats.exactCount / stats.gradedCount) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-sky-500/10 to-neutral-900 p-6 text-center shadow-lg shadow-black/20">
        <p className="flex items-center justify-center gap-1.5 text-xs font-medium tracking-wide text-neutral-400">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          </span>
          EN DIRECT
        </p>
        <p
          className={`font-display text-7xl leading-none tracking-wide text-sky-400 transition-transform duration-300 ${
            pulse ? "scale-110" : "scale-100"
          }`}
        >
          {stats.points}
        </p>
        <p className="mt-1 text-xs uppercase tracking-widest text-neutral-500">
          points
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-md shadow-black/20">
          <p className="text-lg font-bold text-sky-400">{stats.pronosCount}</p>
          <p className="text-xs text-neutral-500">Pronos</p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-md shadow-black/20">
          <p className="text-lg font-bold text-emerald-400">
            {stats.correctCount}
          </p>
          <p className="text-xs text-neutral-500">Bons pronos</p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-md shadow-black/20">
          <p className="text-lg font-bold text-sky-400">{stats.exactCount}</p>
          <p className="text-xs text-neutral-500">
            {stats.exactCount > 1 ? "Scores exacts" : "Score exact"}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">
          Précision
        </h3>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-md shadow-black/20">
            <p className="text-xl font-bold text-sky-400">{successRate}%</p>
            <p className="text-xs text-neutral-500">Taux de réussite</p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-md shadow-black/20">
            <p className="text-xl font-bold text-sky-400">{exactRate}%</p>
            <p className="text-xs text-neutral-500">Taux de score exact</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-gradient-to-r from-sky-500/10 to-neutral-900 p-4 text-center shadow-lg shadow-black/20">
        <p className="text-sm text-neutral-400">🏆 Classement général</p>
        <p className="text-lg font-medium text-neutral-100">
          {stats.rank > 0
            ? `#${stats.rank} sur ${stats.totalRanked}`
            : "Pas encore classé"}
        </p>
      </div>
    </div>
  );
}
