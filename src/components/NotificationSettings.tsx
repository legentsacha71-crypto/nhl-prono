"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { BellOff, BellRing, Check, Smartphone } from "lucide-react";
import { PushNotifications } from "@capacitor/push-notifications";
import { updateNotifPrefs } from "@/app/notifications/actions";
import { outdatedAppPlatform } from "@/lib/appUpdate";
import { hapticTap } from "@/lib/native";
import { PUSH_CATEGORIES, pushAllowed, type NotifPrefs, type PushCategory } from "@/lib/notifPrefs";
import { pushPlatform, requestPushPermission, type PushPlatform } from "@/lib/pushDevice";

// Page « Réglages des notifications » : l'état des notifications sur ce
// téléphone (avec de quoi les activer), puis un interrupteur par catégorie.

type DeviceState =
  | { kind: "loading" }
  | { kind: "web" }
  | { kind: "outdated" }
  | { kind: "granted" | "prompt" | "denied"; platform: PushPlatform };

function DeviceStatus({ userId }: { userId: string }) {
  const [state, setState] = useState<DeviceState>({ kind: "loading" });
  const [asking, setAsking] = useState(false);

  const refresh = useCallback(async () => {
    if (outdatedAppPlatform()) return setState({ kind: "outdated" });
    const platform = pushPlatform();
    if (!platform) return setState({ kind: "web" });
    const { receive } = await PushNotifications.checkPermissions();
    setState({
      kind: receive === "granted" ? "granted" : receive === "denied" ? "denied" : "prompt",
      platform,
    });
  }, []);

  // Au chargement, et au retour des Réglages du téléphone.
  useEffect(() => {
    const run = () => void refresh().catch(() => setState({ kind: "web" }));
    run();
    document.addEventListener("visibilitychange", run);
    return () => document.removeEventListener("visibilitychange", run);
  }, [refresh]);

  if (state.kind === "loading") return null;

  const box = "flex items-start gap-3 rounded-2xl border p-4 text-sm";
  if (state.kind === "web" || state.kind === "outdated") {
    return (
      <div className={`${box} border-neutral-800 bg-neutral-900`}>
        <Smartphone className="mt-0.5 h-5 w-5 shrink-0 text-neutral-400" aria-hidden="true" />
        <p className="text-neutral-300">
          {state.kind === "web"
            ? "Les notifications arrivent sur l'appli La Nuit Hockey, sur iPhone et Android."
            : "Mets l'appli à jour pour recevoir les notifications sur ce téléphone."}
        </p>
      </div>
    );
  }

  if (state.kind === "granted") {
    return (
      <div className={`${box} border-emerald-800/60 bg-emerald-950/40`}>
        <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" aria-hidden="true" />
        <p className="text-emerald-100">Les notifications sont activées sur ce téléphone.</p>
      </div>
    );
  }

  const platform = state.platform;
  if (state.kind === "prompt") {
    return (
      <div className={`${box} border-sky-800/60 bg-sky-950/40`}>
        <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-sky-400" aria-hidden="true" />
        <div className="min-w-0 flex-1 space-y-3">
          <p className="text-sky-100">Les notifications ne sont pas encore activées sur ce téléphone.</p>
          <button
            type="button"
            disabled={asking}
            onClick={async () => {
              setAsking(true);
              await requestPushPermission(platform, userId);
              setAsking(false);
              void refresh();
            }}
            className="rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            Activer les notifications
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`${box} border-amber-800/60 bg-amber-950/30`}>
      <BellOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" aria-hidden="true" />
      <div className="min-w-0 flex-1 space-y-3">
        <p className="text-amber-100">
          Les notifications sont coupées dans les réglages du téléphone :{" "}
          <span className="font-semibold">
            {platform === "ios"
              ? "Réglages › La Nuit Hockey › Notifications"
              : "Paramètres › Applications › La Nuit Hockey › Notifications"}
          </span>
          .
        </p>
        {platform === "ios" && (
          <a
            href="app-settings:"
            className="inline-block rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-neutral-950 transition-transform active:scale-[0.98]"
          >
            Ouvrir les Réglages
          </a>
        )}
      </div>
    </div>
  );
}

function Toggle({ on, label, onChange }: { on: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${on ? "bg-sky-500" : "bg-neutral-700"}`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform duration-200 ${
          on ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function NotificationSettings({ userId, initialPrefs }: { userId: string; initialPrefs: NotifPrefs }) {
  const [prefs, setPrefs] = useState<NotifPrefs>(initialPrefs);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function toggle(category: PushCategory) {
    const previous = prefs;
    const next = { ...prefs, [category]: !pushAllowed(prefs, category) };
    setPrefs(next);
    setError(null);
    void hapticTap();
    startTransition(async () => {
      const result = await updateNotifPrefs(next).catch(() => ({ error: "Réglage non enregistré, réessaie." }));
      if (result.error) {
        setPrefs(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="space-y-5">
      <DeviceStatus userId={userId} />

      <ul className="divide-y divide-neutral-800 overflow-hidden rounded-2xl border border-neutral-800 bg-neutral-900">
        {PUSH_CATEGORIES.map((c) => (
          <li key={c.id} className="flex items-center gap-4 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-neutral-100">{c.label}</p>
              <p className="mt-0.5 text-xs leading-snug text-neutral-500">{c.description}</p>
            </div>
            <Toggle on={pushAllowed(prefs, c.id)} label={c.label} onChange={() => toggle(c.id)} />
          </li>
        ))}
      </ul>

      {error && <p className="text-center text-xs text-red-400">{error}</p>}
      <p className="text-center text-xs text-neutral-600">
        Les notifications de la cloche, dans l&apos;appli, restent toujours visibles.
      </p>
    </div>
  );
}
