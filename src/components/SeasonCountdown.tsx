"use client";

import { useEffect, useState } from "react";

function getTimeLeft(targetDate: string) {
  const diff = new Date(targetDate).getTime() - Date.now();
  if (diff <= 0) return null;

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

export default function SeasonCountdown({
  targetDate,
}: {
  targetDate: string;
}) {
  const [timeLeft, setTimeLeft] = useState(() => getTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft(getTimeLeft(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (!timeLeft) return null;

  return (
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center shadow-lg shadow-black/20">
      <p className="mb-2 text-sm text-neutral-400">
        Début de la saison régulière
      </p>
      <div className="flex justify-center gap-4">
        {[
          { value: timeLeft.days, label: "jours" },
          { value: timeLeft.hours, label: "h" },
          { value: timeLeft.minutes, label: "min" },
          { value: timeLeft.seconds, label: "s" },
        ].map((unit) => (
          <div key={unit.label}>
            <p className="bg-gradient-to-b from-sky-300 to-sky-500 bg-clip-text text-2xl font-black text-transparent drop-shadow-[0_0_10px_rgba(56,189,248,0.25)]">
              {unit.value}
            </p>
            <p className="text-xs text-neutral-500">{unit.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
