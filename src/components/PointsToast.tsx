"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Target, X } from "lucide-react";
import { isPublicPath } from "@/lib/publicPaths";

type Item = { id: string; points: number; exact: boolean };
type Toast = { points: number; count: number; exact: number };

const SHOW_MS = 6000;
const MIN_CHECK_INTERVAL_MS = 60_000;

function storageKey(userId: string) {
  return `lnh:points-annonces:${userId}`;
}

// Compare les pronos notés récemment à ceux déjà annoncés sur cet appareil.
// Premier passage (rien de mémorisé) : on mémorise sans rien annoncer, pour ne
// pas afficher d'un coup les points de toute la semaine. Si le stockage est
// indisponible (navigation privée...), on n'annonce rien plutôt que de
// répéter la même annonce à chaque ouverture.
function takeNew(userId: string, items: Item[]): Item[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    localStorage.setItem(
      storageKey(userId),
      JSON.stringify(items.map((item) => item.id)),
    );
    if (raw === null) return [];
    const seen = new Set<string>(JSON.parse(raw));
    return items.filter((item) => !seen.has(item.id));
  } catch {
    return [];
  }
}

// Bandeau qui glisse depuis le haut à l'ouverture de l'appli quand des
// pronostics ont été notés depuis la dernière visite : "+212 pts, 3 matchs
// notés, 1 score exact". Vérifie au chargement et au retour au premier plan
// (l'appli reste souvent ouverte en arrière-plan pendant les matchs).
export default function PointsToast() {
  const pathname = usePathname();
  const hidden = isPublicPath(pathname);
  const [toast, setToast] = useState<Toast | null>(null);
  const [leaving, setLeaving] = useState(false);
  const lastCheck = useRef(0);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismiss = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setLeaving(true);
  }, []);

  const check = useCallback(async () => {
    if (Date.now() - lastCheck.current < MIN_CHECK_INTERVAL_MS) return;
    lastCheck.current = Date.now();
    try {
      const res = await fetch("/api/recent-points", { cache: "no-store" });
      if (!res.ok) return;
      const { userId, items } = (await res.json()) as {
        userId: string;
        items: Item[];
      };
      const fresh = takeNew(userId, items);
      if (fresh.length === 0) return;
      setLeaving(false);
      setToast({
        points: fresh.reduce((sum, item) => sum + item.points, 0),
        count: fresh.length,
        exact: fresh.filter((item) => item.exact).length,
      });
      if (hideTimer.current) clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(dismiss, SHOW_MS);
    } catch {
      // réseau indisponible : on réessaiera au prochain retour dans l'appli
    }
  }, [dismiss]);

  useEffect(() => {
    if (hidden) return;
    const initial = setTimeout(check, 800);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(initial);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [hidden, check]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    },
    [],
  );

  if (!toast || hidden) return null;

  const gained = toast.points > 0;

  return (
    <div
      role="status"
      aria-live="polite"
      onAnimationEnd={() => {
        if (leaving) {
          setToast(null);
          setLeaving(false);
        }
      }}
      className={`fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.5rem)] z-[70] mx-auto max-w-md ${
        leaving ? "animate-toast-out" : "animate-toast-in"
      }`}
    >
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-neutral-900/90 p-3 pr-2 shadow-2xl shadow-black/60 ring-1 ring-sky-500/20 backdrop-blur-md">
        <Link
          href="/notifications"
          onClick={dismiss}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <div
            className={`flex h-12 min-w-14 shrink-0 flex-col items-center justify-center rounded-xl px-2 ${
              gained ? "bg-sky-500/15 text-sky-300" : "bg-neutral-800 text-neutral-400"
            }`}
          >
            <span className="font-display text-2xl leading-none tracking-wide">
              {gained ? `+${toast.points}` : "0"}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide opacity-80">
              pts
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-neutral-100">
              {toast.count} match{toast.count > 1 ? "s" : ""} noté
              {toast.count > 1 ? "s" : ""}
              {!gained && " · pas de points cette fois"}
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-neutral-400">
              {toast.exact > 0 && (
                <span className="inline-flex items-center gap-1 font-medium text-amber-300">
                  <Target size={13} aria-hidden="true" />
                  {toast.exact} score{toast.exact > 1 ? "s" : ""} exact
                  {toast.exact > 1 ? "s" : ""} ·
                </span>
              )}
              Voir le détail
              <ChevronRight size={13} aria-hidden="true" />
            </p>
          </div>
        </Link>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Fermer"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-neutral-800 hover:text-neutral-200"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
