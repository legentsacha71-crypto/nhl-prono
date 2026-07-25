"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type SlidingTabItem = {
  key: string;
  label: ReactNode;
  content: ReactNode;
};

/**
 * Bascule générique entre deux onglets avec un rendu "coulissant" : les deux
 * panneaux sont déjà rendus côté serveur (passés en props), on ne fait que
 * les translater horizontalement — pas de rechargement / état de chargement
 * entre les deux. Navigation par appui direct sur un onglet OU par swipe
 * horizontal. Logique extraite de l'ancien ProfileTabs (Général/Stats),
 * maintenant aussi utilisée par la page Matchs (À venir/Calendrier).
 */
export default function SlidingTabs({
  tabs,
}: {
  tabs: readonly [SlidingTabItem, SlidingTabItem];
}) {
  const [active, setActive] = useState(0);
  const [dragPercent, setDragPercent] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(0);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;
    let axis: "x" | "y" | null = null;

    function onStart(e: TouchEvent) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      axis = null;
      setIsDragging(true);
    }

    function onMove(e: TouchEvent) {
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;

      if (!axis) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
        axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      // Swipe vertical : on laisse le scroll normal de la page se faire.
      if (axis === "y") return;

      // Empêche le scroll de la page pendant un swipe horizontal.
      e.preventDefault();

      // Résistance quand on essaie de swiper au-delà du premier/dernier onglet.
      let resisted = dx;
      if (activeRef.current === 0 && dx > 0) resisted = dx / 3;
      if (activeRef.current === 1 && dx < 0) resisted = dx / 3;

      const width = el?.offsetWidth || 1;
      setDragPercent((resisted / width) * 50);
    }

    function onEnd() {
      setIsDragging(false);
      setDragPercent((current) => {
        const threshold = 12; // ~ un quart du panneau
        if (current < -threshold && activeRef.current === 0) {
          setActive(1);
        } else if (current > threshold && activeRef.current === 1) {
          setActive(0);
        }
        return 0;
      });
      axis = null;
    }

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, []);

  const baseTranslate = active === 0 ? 0 : -50;
  const translate = baseTranslate + dragPercent;

  return (
    <div>
      <div
        role="tablist"
        className="flex gap-1 rounded-full border border-neutral-800 bg-neutral-900 p-1"
      >
        {tabs.map((tab, index) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active === index}
            onClick={() => setActive(index)}
            className={`flex-1 rounded-full py-1.5 text-center text-sm font-medium transition-colors ${
              active === index
                ? "bg-sky-600 text-white"
                : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div ref={containerRef} className="mt-4 overflow-hidden">
        <div
          className="flex w-[200%] items-start"
          style={{
            transform: `translateX(${translate}%)`,
            transition: isDragging
              ? "none"
              : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {tabs.map((tab, index) => (
            <div
              key={tab.key}
              className={`w-1/2 shrink-0 ${index === 0 ? "pr-1" : "pl-1"}`}
              aria-hidden={active !== index}
            >
              {tab.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
