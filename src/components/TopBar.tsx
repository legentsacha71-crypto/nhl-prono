import type { ReactNode } from "react";
import Link from "next/link";
import { Bell, MessageCircle } from "lucide-react";
import { getUnreadCount } from "@/lib/unreadCount";
import Logo from "@/components/Logo";

// `menu` : bouton affiché à gauche du logo (le menu de l'accueil).
export default async function TopBar({ menu }: { menu?: ReactNode } = {}) {
  const unreadCount = await getUnreadCount();

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-800 bg-neutral-900/95 shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          {menu}
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Logo size="sm" />
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/chat"
            className="text-neutral-300 transition-colors hover:text-sky-400"
            aria-label="Chat"
          >
            <MessageCircle size={22} aria-hidden="true" />
          </Link>
          <Link
            href="/notifications"
            className="relative text-neutral-300 transition-colors hover:text-sky-400"
            aria-label="Notifications"
          >
            <Bell size={22} aria-hidden="true" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white shadow-md shadow-red-950/60">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
