import Link from "next/link";
import { login } from "./actions";
import Logo from "@/components/Logo";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <Logo size="md" className="justify-center" />
        <h2 className="text-center text-neutral-400">Se connecter</h2>

        {error && (
          <p className="rounded-md border border-red-900 bg-red-950 p-3 text-sm text-red-400">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-md border border-emerald-900 bg-emerald-950 p-3 text-sm text-emerald-400">
            {message}
          </p>
        )}

        <form action={login} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-neutral-300"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-neutral-300"
            >
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 p-2 text-neutral-100"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-sky-600 p-2 font-medium text-white"
          >
            Se connecter
          </button>
        </form>

        <p className="text-center text-sm text-neutral-400">
          Pas encore de compte ?{" "}
          <Link href="/signup" className="font-medium text-sky-400">
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}
