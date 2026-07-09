"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/", label: "Accueil", icon: "🏠" },
  { href: "/matches", label: "Matchs", icon: "🏒" },
  { href: "/leagues", label: "Ligues", icon: "👥" },
  { href: "/ranking", label: "Classement", icon: "🏆" },
  { href: "/profil", label: "Profil", icon: "👤" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-800 bg-neutral-900/95 shadow-[0_-4px_20px_rgba(0,0,0,0.35)] backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-md items-stretch justify-between">
        {items.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                className={`group flex flex-col items-center gap-1 py-2 text-xs font-medium transition-colors duration-200 ${
                  isActive
                    ? "text-sky-400"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none transition-all duration-200 ${
                    isActive
                      ? "scale-110 bg-sky-500/15 shadow-[0_0_12px_rgba(56,189,248,0.25)]"
                      : "scale-100 group-hover:bg-neutral-800/60"
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
