"use client";

import { useEffect, useRef, useState } from "react";
import TeamBadge from "@/components/TeamBadge";

export type CalendarGame = {
  id: number;
  awayAbbrev: string;
  awayName: string;
  homeAbbrev: string;
  homeName: string;
  status: "final" | "live" | "scheduled";
  // Score "3 - 2" (terminé ou en cours), sinon heure de début.
  label: string;
  provisional: boolean;
};

export type CalendarMonth = {
  label: string;
  open: boolean;
  days: { label: string; games: CalendarGame[] }[];
};

// Cellule score/heure : une fois le match terminé, le score prend le relief
// du font-display façon tableau d'affichage sportif plutôt que rester en
// texte neutre discret.
function ScoreCell({ game }: { game: CalendarGame }) {
  return (
    <span
      title={
        game.provisional
          ? "Heure estimée, en attente de confirmation par la ligue"
          : undefined
      }
      className={`w-14 shrink-0 rounded-full text-center ${
        game.status === "final"
          ? "bg-neutral-800 py-0.5 font-display text-sm tracking-wide text-sky-400"
          : game.status === "live"
            ? "bg-red-950/40 py-0.5 font-display text-sm tracking-wide text-red-400"
            : game.provisional
              ? "text-xs text-amber-500/80"
              : "text-xs text-neutral-500"
      }`}
    >
      {game.label}
    </span>
  );
}

function MonthDetails({
  month,
  league,
}: {
  month: CalendarMonth;
  league: "nhl" | "magnus";
}) {
  // Les lignes d'un mois replié ne sont construites qu'à sa première
  // ouverture : une saison complète en compte plus de 1 300, et les créer
  // toutes d'un coup ralentissait chaque passage sur l'onglet Matchs.
  const [rendered, setRendered] = useState(month.open);

  return (
    <details
      open={month.open}
      onToggle={(e) => {
        if (e.currentTarget.open) setRendered(true);
      }}
      className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900"
    >
      <summary className="cursor-pointer select-none px-4 py-3 text-sm font-semibold text-neutral-200">
        {month.label}
      </summary>
      {rendered && (
        <div className="space-y-3 border-t border-neutral-800 px-3 pb-3 pt-3">
          {month.days.map((day) => (
            <div key={day.label} className="space-y-1.5">
              <h3 className="px-1 text-xs font-medium text-neutral-500">
                {day.label}
              </h3>
              <ul className="space-y-1.5">
                {day.games.map((game) => (
                  <li
                    key={game.id}
                    className="flex items-center gap-2 rounded-md border border-neutral-800 bg-neutral-950/60 px-3 py-2 text-sm"
                  >
                    <div className="flex flex-1 items-center justify-end gap-1.5 text-right">
                      <span className="truncate text-neutral-300">
                        {game.homeAbbrev}
                      </span>
                      <TeamBadge
                        abbrev={game.homeAbbrev}
                        name={game.homeName}
                        size={22}
                        league={league}
                      />
                    </div>
                    <ScoreCell game={game} />
                    <div className="flex flex-1 items-center gap-1.5">
                      <TeamBadge
                        abbrev={game.awayAbbrev}
                        name={game.awayName}
                        size={22}
                        league={league}
                      />
                      <span className="truncate text-neutral-300">
                        {game.awayAbbrev}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </details>
  );
}

type LoadState =
  | { status: "idle" | "loading" | "error" }
  | { status: "ready"; months: CalendarMonth[] };

const NOTICE =
  "rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400";

// Le calendrier complet (plus de 1 300 matchs NHL) n'est plus envoyé avec la
// page Matchs : il est demandé à /api/calendar/[league] la première fois que
// l'onglet "Calendrier" devient visible (l'onglet inactif de SlidingTabs est
// rogné par son conteneur overflow-hidden, donc invisible pour
// l'IntersectionObserver tant qu'on n'y a pas glissé).
export default function CalendarMonths({
  league,
}: {
  league: "nhl" | "magnus";
}) {
  const [state, setState] = useState<LoadState>({ status: "idle" });
  const [attempt, setAttempt] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    let cancelled = false;

    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      observer.disconnect();
      setState({ status: "loading" });
      fetch(`/api/calendar/${league}`)
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          return res.json() as Promise<CalendarMonth[]>;
        })
        .then((months) => {
          if (!cancelled) setState({ status: "ready", months });
        })
        .catch(() => {
          if (!cancelled) setState({ status: "error" });
        });
    });
    observer.observe(el);

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [league, attempt]);

  return (
    <div ref={rootRef} className="space-y-4">
      {(state.status === "idle" || state.status === "loading") && (
        <p className={NOTICE}>Chargement du calendrier…</p>
      )}
      {state.status === "error" && (
        <p className={NOTICE}>
          Le calendrier n&apos;a pas pu être chargé.{" "}
          <button
            type="button"
            onClick={() => setAttempt((n) => n + 1)}
            className="font-medium text-sky-400"
          >
            Réessayer
          </button>
        </p>
      )}
      {state.status === "ready" && state.months.length === 0 && (
        <p className={NOTICE}>
          Le calendrier de la saison n&apos;est pas encore publié.
        </p>
      )}
      {state.status === "ready" &&
        state.months.map((month) => (
          <MonthDetails key={month.label} month={month} league={league} />
        ))}
    </div>
  );
}
