"use client";

import { useSyncExternalStore, type CSSProperties } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getPendingHref,
  setPendingHref,
  subscribePendingHref,
} from "@/lib/navigationPending";

const items = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/matches", label: "Matchs", icon: "🏒" },
  { href: "/leagues", label: "Ligues", icon: "👥" },
  { href: "/ranking", label: "Classement", icon: "🏆" },
  { href: "/profil", label: "Profil", icon: "👤" },
];

// Pages sans barre du bas : connexion, inscription, et les deux pages
// publiques fournies à Apple/Google (accessibles sans compte).
const HIDDEN_ON = ["/login", "/signup", "/confidentialite", "/assistance"];

function activeIndex(path: string) {
  return items.findIndex((item) =>
    item.href === "/" ? path === "/" : path.startsWith(item.href),
  );
}

// Barre "liquid" : l'onglet actif monte dans un cercle qui dépasse de la
// barre, dans une encoche découpée dans la barre (voir .nav-liquid-* dans
// globals.css), et les deux glissent d'un onglet à l'autre. Rendue une seule
// fois dans le layout racine : si chaque page avait la sienne, elle serait
// recréée à chaque navigation et le cercle sauterait au lieu de glisser.
export default function BottomNav() {
  const pathname = usePathname();
  const pendingHref = useSyncExternalStore(
    subscribePendingHref,
    getPendingHref,
    () => null,
  );

  if (HIDDEN_ON.some((prefix) => pathname.startsWith(prefix))) return null;

  // L'onglet touché s'allume (et le cercle part) tout de suite, sans attendre
  // l'arrivée de la page.
  const current = activeIndex(pendingHref ?? pathname);

  // Dans cette version de Next.js, <Link> conserve la position de scroll par
  // défaut (au lieu de remonter en haut) tant que la page cible reste dans
  // le viewport — voir node_modules/next/dist/docs/.../components/link.md,
  // section "Disable scrolling to the top of the page". On force donc le
  // retour en haut au clic, comme dans une appli mobile.
  return (
    <nav
      className="nav-liquid fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)]"
      style={{ "--nav-i": Math.max(current, 0) } as CSSProperties}
    >
      <div
        aria-hidden="true"
        data-notch={current !== -1}
        className="nav-liquid-bar absolute inset-0 border-t border-neutral-800 bg-neutral-900"
      />
      <ul className="relative mx-auto flex h-16 max-w-md">
        <li
          aria-hidden="true"
          className={`nav-liquid-indicator pointer-events-none bg-sky-500 shadow-[0_4px_14px_rgba(14,165,233,0.45)] transition-opacity duration-300 ${
            current === -1 ? "opacity-0" : "opacity-100"
          }`}
        />

        {items.map((item, index) => {
          const isActive = index === current;
          return (
            <li key={item.href} className="relative z-10 flex-1">
              <Link
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  if (item.href !== pathname) setPendingHref(item.href);
                }}
                className="relative flex h-16 flex-col items-center justify-center"
              >
                <span
                  aria-hidden="true"
                  className={`flex h-8 w-8 items-center justify-center text-2xl leading-none transition-[transform,opacity] duration-500 motion-reduce:transition-none ${
                    isActive ? "-translate-y-8 opacity-100" : "opacity-60"
                  }`}
                >
                  {item.icon}
                </span>
                <span
                  className={`absolute bottom-1.5 text-[11px] font-medium text-sky-400 transition-[transform,opacity] duration-500 motion-reduce:transition-none ${
                    isActive
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0"
                  }`}
                >
                  {item.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
