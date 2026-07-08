import Link from "next/link";
import { signup } from "../login/actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-bold text-center">NHL Prono</h1>
        <h2 className="text-center text-gray-600">Créer un compte</h2>

        {error && (
          <p className="rounded-md bg-red-100 p-3 text-sm text-red-700">
            {error}
          </p>
        )}
        {message && (
          <p className="rounded-md bg-green-100 p-3 text-sm text-green-700">
            {message}
          </p>
        )}

        <form action={signup} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium">
              Pseudo
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              minLength={3}
              maxLength={20}
              className="mt-1 w-full rounded-md border border-gray-300 p-2"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-gray-300 p-2"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Mot de passe
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1 w-full rounded-md border border-gray-300 p-2"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-md bg-blue-600 p-2 font-medium text-white"
          >
            Créer un compte
          </button>
        </form>

        <p className="text-center text-sm text-gray-600">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-blue-600">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
