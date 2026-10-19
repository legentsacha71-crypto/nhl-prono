import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { createClient } from "@/utils/supabase/server";
import TopBar from "@/components/TopBar";
import NotificationSettings from "@/components/NotificationSettings";
import { getUnreadCount } from "@/lib/unreadCount";
import { readNotifPrefs } from "@/lib/notifPrefs";

// Réglages des notifications (menu, ou roue dentée de la page Notifications).
// getUser() plutôt que les infos du jeton de connexion : elles peuvent dater
// d'avant le dernier changement de réglage.
export default async function NotificationSettingsPage() {
  void getUnreadCount();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-5">
        <div>
          <Link
            href="/notifications"
            className="-ml-1 inline-flex items-center gap-0.5 text-sm text-neutral-400 transition-colors hover:text-sky-400"
          >
            <ChevronLeft size={18} aria-hidden="true" />
            Notifications
          </Link>
          <h1 className="mt-2 text-3xl font-black italic tracking-tight text-neutral-50">
            Réglages des <span className="text-sky-400">notifs</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-400">Choisis ce que tu veux recevoir sur ton téléphone.</p>
        </div>
        <NotificationSettings userId={user.id} initialPrefs={readNotifPrefs(user.user_metadata)} />
      </div>
    </div>
  );
}
