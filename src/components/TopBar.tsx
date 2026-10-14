import Link from "next/link";
import { Bell, MessageCircle, UserPlus } from "lucide-react";
import {
  getCurrentUsername,
  getPendingFriendRequestCount,
  getUnreadCount,
} from "@/lib/unreadCount";
import HomeMenu from "@/components/HomeMenu";
import { deleteAccount, updateUsername } from "@/app/profil/actions";
import Logo from "@/components/Logo";

// Le menu (trois barres, à gauche du logo) est présent sur toutes les pages
// dès que le joueur est connecté.
export default async function TopBar() {
  const [unreadCount, friendRequestCount, username] = await Promise.all([
    getUnreadCount(),
    getPendingFriendRequestCount(),
    getCurrentUsername(),
  ]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-800 bg-neutral-900/95 shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
        <div className="flex items-center gap-2">
          {username && (
            <HomeMenu username={username} updateUsername={updateUsername} deleteAccount={deleteAccount} />
          )}
          <Link
            href="/"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
          >
            <Logo size="sm" />
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/amis"
            className="relative text-neutral-300 transition-colors hover:text-sky-400"
            aria-label="Mes amis"
          >
            <UserPlus size={22} aria-hidden="true" />
            {friendRequestCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white shadow-md shadow-red-950/60">
                {friendRequestCount > 9 ? "9+" : friendRequestCount}
              </span>
            )}
          </Link>
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
