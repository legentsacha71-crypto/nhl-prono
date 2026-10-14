import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";
import { getRanking } from "@/lib/ranking";
import { respondToFriendRequest, removeFriend } from "@/app/profil/actions";
import TopBar from "@/components/TopBar";
import { getUnreadCount } from "@/lib/unreadCount";
import RankAvatar from "@/components/RankAvatar";
import SubmitButton from "@/components/SubmitButton";
import FriendRequestActions from "@/components/FriendRequestActions";
import FriendSearch, { type FriendRelation } from "@/components/FriendSearch";

type Profile = { username: string; avatar_url: string | null } | null;

type FriendshipRow = {
  id: string;
  status: string;
  requester_id: string;
  addressee_id: string;
  requester: Profile;
  addressee: Profile;
};

// Mes amis (icône en haut de l'écran) : chercher et ajouter un joueur,
// répondre aux demandes reçues, et le classement entre amis.
export default async function FriendsPage() {
  void getUnreadCount();
  const supabase = await createClient();
  const user = await getCurrentUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("friendships")
    .select(
      "id, status, requester_id, addressee_id, requester:profiles!friendships_requester_id_fkey(username, avatar_url), addressee:profiles!friendships_addressee_id_fkey(username, avatar_url)",
    )
    .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
  const rows = (data ?? []) as unknown as FriendshipRow[];

  const relations: Record<string, FriendRelation> = {};
  const friendshipByFriend = new Map<string, string>();
  for (const f of rows) {
    const mine = f.requester_id === user.id;
    const other = mine ? f.addressee_id : f.requester_id;
    if (f.status === "accepted") {
      relations[other] = "friend";
      friendshipByFriend.set(other, f.id);
    } else {
      relations[other] = mine ? "sent" : "received";
    }
  }

  const incoming = rows.filter((f) => f.status === "pending" && f.addressee_id === user.id);
  const outgoing = rows.filter((f) => f.status === "pending" && f.requester_id === user.id);
  const friendIds = [...friendshipByFriend.keys()];

  // Classement entre amis (points de la saison), le joueur compris.
  const ranking = friendIds.length > 0 ? await getRanking(supabase, [user.id, ...friendIds]) : [];

  return (
    <div className="min-h-screen p-6 pt-28 pb-24">
      <TopBar />
      <div className="mx-auto w-full max-w-md space-y-6">
        <div className="relative overflow-hidden rounded-2xl border border-sky-900/40 bg-gradient-to-br from-sky-600/20 via-neutral-900 to-neutral-950 p-5 text-center shadow-xl shadow-black/30">
          <div className="pointer-events-none absolute -right-6 -top-6 text-8xl opacity-10">👥</div>
          <h1 className="text-3xl font-black italic tracking-tight text-neutral-50">
            Mes <span className="text-sky-400">amis</span>
          </h1>
          <p className="mt-1 text-sm text-neutral-400">Ajoute tes potes et compare vos points 🏒</p>
        </div>

        <section className="space-y-2">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">Ajouter un ami</h2>
          <FriendSearch relations={relations} />
        </section>

        {incoming.length > 0 && (
          <section className="space-y-2">
            <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
              Demandes reçues
            </h2>
            {incoming.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-2xl border border-sky-800/60 bg-sky-950/50 p-3"
              >
                <RankAvatar
                  avatarUrl={r.requester?.avatar_url ?? null}
                  username={r.requester?.username ?? "?"}
                  size={36}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-sky-100">
                    {r.requester?.username ?? "?"}
                  </span>
                  <span className="block text-xs text-sky-300/80">veut être ton ami</span>
                </span>
                <FriendRequestActions friendshipId={r.id} respondToFriendRequest={respondToFriendRequest} />
              </div>
            ))}
          </section>
        )}

        <section className="space-y-2">
          <h2 className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
            {friendIds.length > 0 ? "Classement entre amis" : "Tes amis"}
          </h2>
          {friendIds.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-neutral-700 bg-neutral-900 p-5 text-center text-sm text-neutral-400">
              Pas encore d&apos;amis ici. Cherche leur pseudo juste au-dessus pour les ajouter.
            </p>
          ) : (
            <ol className="divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
              {ranking.map((entry, index) => {
                const isMe = entry.userId === user.id;
                const friendshipId = friendshipByFriend.get(entry.userId);
                return (
                  <li
                    key={entry.userId}
                    className={`flex items-center gap-3 px-3.5 py-2.5 ${isMe ? "bg-sky-500/10" : ""}`}
                  >
                    <span className="w-5 text-center font-display text-base text-neutral-500">{index + 1}</span>
                    <Link
                      href={isMe ? "/profil" : `/profil/${entry.userId}`}
                      prefetch={false}
                      className="flex min-w-0 flex-1 items-center gap-2.5 transition-opacity active:opacity-70"
                    >
                      <RankAvatar
                        avatarUrl={entry.avatarUrl}
                        username={entry.username}
                        points={entry.totalPoints}
                        size={36}
                      />
                      <span className="truncate text-sm font-medium text-neutral-100">{entry.username}</span>
                      {isMe && (
                        <span className="shrink-0 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-400">
                          Toi
                        </span>
                      )}
                    </Link>
                    <span className="font-display text-lg tracking-wide text-sky-400">{entry.totalPoints}</span>
                    {/* Colonne de largeur fixe : les points restent alignés sur la
                        ligne du joueur, qui n'a pas de bouton Retirer. */}
                    <span className="flex w-11 justify-end">
                      {friendshipId && (
                        <form action={removeFriend}>
                          <input type="hidden" name="friendshipId" value={friendshipId} />
                          <SubmitButton className="text-[11px] text-neutral-600 transition-colors hover:text-red-400 active:scale-[0.97]">
                            Retirer
                          </SubmitButton>
                        </form>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
          {outgoing.length > 0 && (
            <p className="px-1 text-xs text-neutral-500">
              En attente de réponse :{" "}
              {outgoing
                .map((r) => r.addressee?.username)
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
