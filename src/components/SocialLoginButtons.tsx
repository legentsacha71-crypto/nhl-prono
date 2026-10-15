"use client";

import { useState, useSyncExternalStore } from "react";
import { Capacitor } from "@capacitor/core";
import { createClient } from "@/utils/supabase/client";
import { hasNativePlugin } from "@/lib/native";
import {
  AFTER_SOCIAL_LOGIN,
  GOOGLE_IOS_CLIENT_ID,
  GOOGLE_WEB_CLIENT_ID,
  SOCIAL_LOGIN_ENABLED,
} from "@/lib/socialLogin";

// Boutons « Continuer avec Apple / Google » des pages de connexion et
// d'inscription. Dans l'appli : connexion native (module SocialLogin), puis
// session Supabase à partir du jeton d'identité. Sur le site : Google par
// redirection (Apple n'est proposé que sur iPhone). Les anciennes versions
// de l'appli, sans le module, n'affichent rien : la connexion Google en
// redirection y est bloquée par Google.

type Provider = "apple" | "google";

const noopSubscribe = () => () => {};

function randomNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

let initialized: Promise<void> | null = null;

async function nativeLogin(provider: Provider): Promise<void> {
  const { SocialLogin } = await import("@capgo/capacitor-social-login");
  initialized ??= SocialLogin.initialize({
    apple: {},
    google: {
      webClientId: GOOGLE_WEB_CLIENT_ID,
      iOSClientId: GOOGLE_IOS_CLIENT_ID || undefined,
      iOSServerClientId: GOOGLE_WEB_CLIENT_ID,
      mode: "online",
    },
  });
  await initialized;

  // Le fournisseur reçoit le nonce haché ; Supabase vérifie avec le brut.
  const rawNonce = randomNonce();
  const nonce = await sha256(rawNonce);
  const { result } =
    provider === "apple"
      ? await SocialLogin.login({ provider: "apple", options: { scopes: ["email", "name"], nonce } })
      : await SocialLogin.login({ provider: "google", options: { scopes: ["email", "profile"], nonce } });
  const idToken = "idToken" in result ? result.idToken : null;
  if (!idToken) throw new Error("Connexion annulée.");

  const { error } = await createClient().auth.signInWithIdToken({ provider, token: idToken, nonce: rawNonce });
  if (error) throw error;
  window.location.assign(AFTER_SOCIAL_LOGIN);
}

async function webGoogleLogin(): Promise<void> {
  const { error } = await createClient().auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/auth/callback` },
  });
  if (error) throw error;
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 fill-current">
      <path d="M16.37 12.62c-.03-2.7 2.2-4 2.3-4.07-1.26-1.84-3.21-2.09-3.9-2.12-1.66-.17-3.24.98-4.08.98-.85 0-2.14-.96-3.52-.93-1.81.03-3.48 1.05-4.41 2.67-1.88 3.26-.48 8.08 1.35 10.73.9 1.29 1.96 2.75 3.36 2.7 1.35-.05 1.86-.87 3.49-.87 1.63 0 2.09.87 3.51.84 1.45-.03 2.37-1.32 3.26-2.62 1.03-1.5 1.45-2.95 1.47-3.02-.03-.01-2.82-1.08-2.85-4.29zM13.7 4.7c.74-.9 1.24-2.15 1.11-3.39-1.07.04-2.36.71-3.13 1.61-.68.79-1.28 2.07-1.12 3.29 1.19.09 2.4-.6 3.14-1.51z" />
    </svg>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function SocialLoginButtons() {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Plateforme lue après l'hydratation (le serveur ne la connaît pas).
  const platform = useSyncExternalStore(noopSubscribe, () => Capacitor.getPlatform(), () => "server");

  if (!SOCIAL_LOGIN_ENABLED || platform === "server" || !GOOGLE_WEB_CLIENT_ID) return null;
  const native = platform === "ios" || platform === "android";
  const nativeReady = native && hasNativePlugin("SocialLogin");
  if (native && !nativeReady) return null;

  const showApple = platform === "ios";
  const showGoogle = !native || platform === "android" || Boolean(GOOGLE_IOS_CLIENT_ID);

  async function start(provider: Provider) {
    setPending(provider);
    setError(null);
    try {
      if (nativeReady) await nativeLogin(provider);
      else await webGoogleLogin();
    } catch (err) {
      const message = err instanceof Error ? err.message : "";
      // Fenêtre fermée par le joueur : pas un vrai problème.
      if (!/annul|cancel/i.test(message)) setError("Connexion impossible pour le moment, réessaie.");
      setPending(null);
    }
  }

  const button =
    "flex w-full items-center justify-center gap-2.5 rounded-xl py-3 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-60";

  return (
    <div className="space-y-3">
      {showApple && (
        <button type="button" onClick={() => start("apple")} disabled={pending !== null} className={`${button} bg-white text-black`}>
          <AppleLogo />
          {pending === "apple" ? "Connexion…" : "Continuer avec Apple"}
        </button>
      )}
      {showGoogle && (
        <button
          type="button"
          onClick={() => start("google")}
          disabled={pending !== null}
          className={`${button} border border-neutral-700 bg-neutral-900 text-neutral-100`}
        >
          <GoogleLogo />
          {pending === "google" ? "Connexion…" : "Continuer avec Google"}
        </button>
      )}
      {error && <p className="text-center text-xs text-red-400">{error}</p>}
      <div className="flex items-center gap-3 text-xs text-neutral-500">
        <span className="h-px flex-1 bg-neutral-800" />
        ou avec ton email
        <span className="h-px flex-1 bg-neutral-800" />
      </div>
    </div>
  );
}
