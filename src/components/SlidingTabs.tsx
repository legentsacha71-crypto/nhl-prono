"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export type SlidingTabItem = {
  key: string;
  label: ReactNode;
  content: ReactNode;
};

/**
 * Bascule générique entre plusieurs onglets avec un rendu "coulissant" : les
 * panneaux sont déjà rendus côté serveur (passés en props), on ne fait que
 * les translater horizontalement — pas de rechargement / état de chargement
 * entre les deux. Navigation par appui direct sur un onglet OU par swipe
 * horizontal. Logique extraite de l'ancien ProfileTabs (Général/Stats),
 * maintenant aussi utilisée par la page Matchs (À venir/Calendrier).
 */
export default function SlidingTabs({
  tabs,
}: {
  tabs: readonly SlidingTabItem[];
}) {
  const count = tabs.length;
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
      if (activeRef.current === count - 1 && dx < 0) resisted = dx / 3;

      // Le déplacement est exprimé en % de la piste (count panneaux de large).
      const width = el?.offsetWidth || 1;
      setDragPercent((resisted / width) * (100 / count));
    }

    function onEnd() {
      setIsDragging(false);
      setDragPercent((current) => {
        const threshold = (100 / count) * 0.24; // ~ un quart du panneau
        if (current < -threshold && activeRef.current < count - 1) {
          setActive(activeRef.current + 1);
        } else if (current > threshold && activeRef.current > 0) {
          setActive(activeRef.current - 1);
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
  }, [count]);

  const baseTranslate = -active * (100 / count);
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
            className={`flex flex-1 items-center justify-center rounded-full py-1.5 text-sm font-medium transition-all active:scale-[0.97] ${
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
          className="flex items-start"
          style={{
            width: `${count * 100}%`,
            transform: `translateX(${translate}%)`,
            transition: isDragging
              ? "none"
              : "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)",
          }}
        >
          {tabs.map((tab, index) => (
            <div
              key={tab.key}
              className={`shrink-0 ${
                index === 0 ? "pr-1" : index === count - 1 ? "pl-1" : "px-1"
              }`}
              style={{ width: `${100 / count}%` }}
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
