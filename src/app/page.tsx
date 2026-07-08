import { createClient } from "@/utils/supabase/server";
import { signout } from "./login/actions";
import BottomNav from "@/components/BottomNav";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single()
    : { data: null };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 pb-24">
      <div className="text-center">
        <img
          src="/logo-la-nuit-nhl.png"
          alt="La Nuit NHL"
          className="mx-auto h-24 w-auto"
        />
        <p className="mt-2 text-neutral-400">
          Content de te revoir, {profile?.username ?? user?.email}
        </p>
      </div>

      <form action={signout}>
        <button className="rounded-md border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-300">
          Se déconnecter
        </button>
      </form>

      <BottomNav />
    </div>
  );
}
