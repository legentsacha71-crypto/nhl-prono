"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import {
  getPendingHref,
  setPendingHref,
  subscribePendingHref,
} from "@/lib/navigationPending";

// Filet de sécurité : une navigation qui n'aboutit jamais (réseau coupé...)
// ne doit pas laisser le squelette affiché indéfiniment.
const MAX_PENDING_MS = 12_000;

// Squelette affiché tout de suite quand on touche un onglet du bas, par-dessus
// l'ancienne page, le temps que le serveur prépare la nouvelle. On ne s'appuie
// pas sur loading.tsx : en production, Next.js affichait parfois un écran vide
// ou rien du tout juste après l'ouverture de l'appli. Les barres du haut et du
// bas (z-50) restent visibles et utilisables.
export default function NavigationOverlay() {
  const pending = useSyncExternalStore(
    subscribePendingHref,
    getPendingHref,
    () => null,
  );
  const pathname = usePathname();

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => setPendingHref(null), MAX_PENDING_MS);
    return () => clearTimeout(timer);
  }, [pending]);

  if (!pending) return null;

  return (
    <div
      role="status"
      className="fixed inset-0 z-40 overflow-hidden bg-background px-6 pt-28 pb-24"
    >
      <span className="sr-only">Chargement…</span>
      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-900" />
        <div className="h-12 animate-pulse rounded-full bg-neutral-900" />
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-lg bg-neutral-900" />
          <div className="h-28 animate-pulse rounded-lg bg-neutral-900" />
          <div className="h-28 animate-pulse rounded-lg bg-neutral-900" />
        </div>
      </div>
    </div>
  );
}
