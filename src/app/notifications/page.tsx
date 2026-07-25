import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { respondToFriendRequest } from "@/app/profil/actions";
import TopBar from "@/components/TopBar";
import BottomNav from "@/components/BottomNav";
import FriendRequestActions from "@/components/FriendRequestActions";

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [{ data: notifications }, { data: friendRequestRows }] =
    await Promise.all([
      supabase
        .from("notifications")
        .select("id, message, created_at, read_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
      // Demandes d'ami en attente : affichées ici sous forme de carte
      // Accepter/Refuser, en plus de la page profil (voir FriendRequestActions).
      supabase
        .from("friendships")
        .select(
          "id, requester:profiles!friendships_requester_id_fkey(username)",
        )
        .eq("addressee_id", user.id)
        .eq("status", "pending"),
    ]);

  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);

  const list = notifications ?? [];

  type FriendRequestRow = {
    id: string;
    requester: { username: string } | null;
  };
  const friendRequests = (friendRequestRows ??
    []) as unknown as FriendRequestRow[];

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold text-center text-sky-400">
          Notifications
        </h1>

        {friendRequests.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-neutral-400">
              👥 Demandes d&apos;ami
            </h2>
            {friendRequests.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-lg border border-sky-800 bg-sky-950 p-3 text-sm shadow-md shadow-sky-950/30"
              >
                <span className="text-sky-100">
                  {r.requester?.username ?? "?"} veut être ton ami
                </span>
                <FriendRequestActions
                  friendshipId={r.id}
                  respondToFriendRequest={respondToFriendRequest}
                />
              </div>
            ))}
          </div>
        )}

        {list.length === 0 ? (
          friendRequests.length === 0 && (
            <p className="rounded-md border border-neutral-800 bg-neutral-900 p-4 text-center text-sm text-neutral-400">
              Aucune notification pour le moment.
            </p>
          )
        ) : (
          <ul className="space-y-2">
            {list.map((n) => (
              <li
                key={n.id}
                className={`rounded-lg border p-3 text-sm ${
                  n.read_at
                    ? "border-neutral-800 bg-neutral-900 text-neutral-300"
                    : "border-sky-800 bg-sky-950 text-sky-100"
                }`}
              >
                <p>{n.message}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {formatTime(n.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
