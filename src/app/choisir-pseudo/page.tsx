import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";
import { USERNAME_MAX, USERNAME_MIN } from "@/lib/username";
import Logo from "@/components/Logo";
import SubmitButton from "@/components/SubmitButton";
import { chooseUsername } from "./actions";

// Dernière étape d'une inscription avec Apple / Google : le pseudo affiché
// dans les classements et les ligues.
export default async function ChooseUsernamePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", user.id).maybeSingle();
  if (profile) redirect("/");

  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <Logo size="md" className="justify-center" />
        <div className="text-center">
          <h1 className="text-2xl font-black italic tracking-tight text-neutral-50">Choisis ton pseudo</h1>
          <p className="mt-1 text-sm text-neutral-400">
            C&apos;est le nom que verront tes amis dans les classements et les ligues.
          </p>
        </div>

        {error && (
          <p className="rounded-md border border-red-900 bg-red-950 p-3 text-sm text-red-400">{error}</p>
        )}

        <form action={chooseUsername} className="space-y-4">
          <input
            name="username"
            type="text"
            required
            minLength={USERNAME_MIN}
            maxLength={USERNAME_MAX}
            autoFocus
            autoCapitalize="none"
            autoCorrect="off"
            placeholder="Ton pseudo"
            aria-label="Pseudo"
            className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-3 text-base text-neutral-100 placeholder:text-neutral-500 focus:border-sky-500 focus:outline-none"
          />
          <SubmitButton className="w-full rounded-xl bg-sky-500 py-3 text-base font-bold text-neutral-950 transition-transform active:scale-[0.98]">
            C&apos;est parti
          </SubmitButton>
        </form>
      </div>
    </div>
  );
}
