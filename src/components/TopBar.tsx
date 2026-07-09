import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import Logo from "@/components/Logo";

export default async function TopBar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let unreadCount = 0;
  if (user) {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("read_at", null);
    unreadCount = count ?? 0;
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-800 bg-neutral-900/95 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
        <Link href="/" className="flex items-center gap-2">
          <Logo size="sm" />
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/chat"
            className="text-xl leading-none text-neutral-300"
            aria-label="Chat"
          >
            💬
          </Link>
          <Link
            href="/notifications"
            className="relative text-xl leading-none text-neutral-300"
            aria-label="Notifications"
          >
            🔔
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
