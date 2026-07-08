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
    <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center">
      <p className="mb-2 text-sm text-neutral-400">
        Début de la saison régulière
      </p>
      <div className="flex justify-center gap-4">
        <div>
          <p className="text-xl font-bold text-sky-400">{timeLeft.days}</p>
          <p className="text-xs text-neutral-500">jours</p>
        </div>
        <div>
          <p className="text-xl font-bold text-sky-400">{timeLeft.hours}</p>
          <p className="text-xs text-neutral-500">h</p>
        </div>
        <div>
          <p className="text-xl font-bold text-sky-400">{timeLeft.minutes}</p>
          <p className="text-xs text-neutral-500">min</p>
        </div>
        <div>
          <p className="text-xl font-bold text-sky-400">{timeLeft.seconds}</p>
          <p className="text-xs text-neutral-500">s</p>
        </div>
      </div>
    </div>
  );
}
