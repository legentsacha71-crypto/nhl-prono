"use client";

import { useEffect, useState, useSyncExternalStore, useTransition } from "react";
import { Capacitor } from "@capacitor/core";
import { registerAndroidTester } from "@/app/android/actions";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
};

const DISMISS_KEY = "androidCalloutDismissed";

const dismissListeners = new Set<() => void>();
let dismissedInMemory = false;

function subscribeDismissed(onChange: () => void) {
  dismissListeners.add(onChange);
  return () => {
    dismissListeners.delete(onChange);
  };
}

function readDismissed() {
  if (dismissedInMemory) return true;
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function dismissForever() {
  // L'indicateur en mémoire couvre le cas où localStorage est indisponible
  // (navigation privée...) : l'encart se masque au moins pour la session.
  dismissedInMemory = true;
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // ignoré, voir ci-dessus
  }
  dismissListeners.forEach((listener) => listener());
}

const noopSubscribe = () => () => {};

// Encart de la page d'accueil, visible uniquement dans un navigateur Android
// (ni dans l'appli native, ni sur iOS/desktop) : invite à installer le site
// sur l'écran d'accueil et recrute des testeurs pour la version Play Store
// (Google impose 12 testeurs pendant 14 jours avant la publication). À
// retirer de src/app/page.tsx une fois les testeurs trouvés.
export default function AndroidCallout({
  alreadyRegistered,
}: {
  alreadyRegistered: boolean;
}) {
  // useSyncExternalStore plutôt qu'un useEffect + setState : rendu serveur à
  // "masqué", puis valeur réelle du navigateur après hydratation, sans écart
  // d'hydratation.
  const isAndroidBrowser = useSyncExternalStore(
    noopSubscribe,
    () => /Android/i.test(navigator.userAgent) && !Capacitor.isNativePlatform(),
    () => false,
  );
  const isStandalone = useSyncExternalStore(
    noopSubscribe,
    () => window.matchMedia("(display-mode: standalone)").matches,
    () => false,
  );
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    readDismissed,
    () => true,
  );

  const [installEvent, setInstallEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallEvent(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!isAndroidBrowser || dismissed) return null;

  const registered = alreadyRegistered || status === "success";

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      try {
        const result = await registerAndroidTester(formData);
        if (result.error) {
          setStatus("error");
          setMessage(result.error);
        } else {
          setStatus("success");
        }
      } catch {
        setStatus("error");
        setMessage("Une erreur est survenue, réessaie.");
      }
    });
  }

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    setInstallEvent(null);
  }

  return (
    <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-emerald-900/40 bg-gradient-to-br from-emerald-600/15 via-neutral-900 to-neutral-950 p-4 shadow-xl shadow-black/30">
      <button
        type="button"
        onClick={dismissForever}
        aria-label="Fermer"
        className="absolute right-2 top-2 rounded-md p-1.5 text-neutral-500 transition-colors hover:text-neutral-200"
      >
        ✕
      </button>

      <p className="pr-8 text-base font-bold text-neutral-50">
        🤖 Tu as un Android ?
      </p>

      {!isStandalone && (
        <div className="mt-3">
          <p className="text-sm text-neutral-300">
            Installe l&apos;appli sur ton écran d&apos;accueil : menu ⋮ de
            Chrome, puis « Installer l&apos;application ».
          </p>
          {installEvent && (
            <button
              type="button"
              onClick={handleInstall}
              className="mt-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-950/40 transition-all duration-150 hover:bg-emerald-500 active:scale-[0.97]"
            >
              Installer maintenant
            </button>
          )}
        </div>
      )}

      <div className={`${isStandalone ? "mt-3" : "mt-4 border-t border-neutral-800/80 pt-3"}`}>
        <p className="text-sm text-neutral-300">
          Aide-moi à tester la version Play Store pendant 2 semaines. Donne
          l&apos;adresse du compte Google de ton téléphone : je t&apos;envoie
          l&apos;invitation dans tes 🔔 Notifications.
        </p>

        {registered ? (
          <p className="mt-2 text-sm font-medium text-emerald-400">
            ✓ Merci ! Je te préviens ici dès que l&apos;invitation est prête.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-2">
            <div className="flex items-center gap-2">
              <input
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="ton.adresse@gmail.com"
                required
                disabled={isPending}
                onChange={() => status === "error" && setStatus("idle")}
                className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-100 placeholder:text-neutral-500 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={isPending}
                className={`rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white shadow-sm shadow-emerald-950/40 transition-all duration-150 hover:bg-emerald-500 active:scale-[0.97] ${
                  isPending ? "cursor-not-allowed opacity-60" : ""
                }`}
              >
                {isPending ? "…" : "Je participe"}
              </button>
            </div>
            {status === "error" && (
              <p className="mt-1 text-xs text-red-400">{message}</p>
            )}
            <p className="mt-1 text-[11px] text-neutral-500">
              Utilisée uniquement pour t&apos;inviter comme testeur.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
