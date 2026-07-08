import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { signout } from "./login/actions";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-2xl font-bold">NHL Prono</h1>
      <p>Connecté en tant que {user?.email}</p>
      <Link
        href="/matches"
        className="rounded-md bg-blue-600 px-4 py-2 font-medium text-white"
      >
        Voir les matchs à venir
      </Link>
      <Link
        href="/leagues"
        className="rounded-md border border-gray-300 px-4 py-2 font-medium"
      >
        Mes ligues
      </Link>
      <Link
        href="/ranking"
        className="rounded-md border border-gray-300 px-4 py-2 font-medium"
      >
        Classement général
      </Link>
      <form action={signout}>
        <button className="rounded-md border border-gray-300 px-4 py-2">
          Se déconnecter
        </button>
      </form>
    </div>
  );
}
