"use client";

import { useState } from "react";
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
                        {game.awayAbbrev}
                      </span>
                      <TeamBadge
                        abbrev={game.awayAbbrev}
                        name={game.awayName}
                        size={22}
                        league={league}
                      />
                    </div>
                    <ScoreCell game={game} />
                    <div className="flex flex-1 items-center gap-1.5">
                      <TeamBadge
                        abbrev={game.homeAbbrev}
                        name={game.homeName}
                        size={22}
                        league={league}
                      />
                      <span className="truncate text-neutral-300">
                        {game.homeAbbrev}
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

export default function CalendarMonths({
  months,
  league,
}: {
  months: CalendarMonth[];
  league: "nhl" | "magnus";
}) {
  return (
    <>
      {months.map((month) => (
        <MonthDetails key={month.label} month={month} league={league} />
      ))}
    </>
  );
}
