import BottomNav from "@/components/BottomNav";
import Logo from "@/components/Logo";

// Affiché tout de suite quand on change d'onglet (via les loading.tsx), le
// temps que le serveur prépare la vraie page : le tap donne un retour
// immédiat au lieu de laisser l'écran figé. L'en-tête reprend celui de
// TopBar (sans la pastille de notifications, qui demande une requête).
export default function PageSkeleton() {
  return (
    <div className="min-h-screen p-6 pt-28 pb-24" role="status">
      <span className="sr-only">Chargement…</span>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-neutral-800 bg-neutral-900/95 shadow-[0_4px_20px_rgba(0,0,0,0.35)] backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-2">
          <Logo size="sm" />
          <div className="flex items-center gap-4 text-xl leading-none text-neutral-300">
            <span aria-hidden="true">💬</span>
            <span aria-hidden="true">🔔</span>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-neutral-900" />
        <div className="h-12 animate-pulse rounded-full bg-neutral-900" />
        <div className="space-y-3">
          <div className="h-28 animate-pulse rounded-lg bg-neutral-900" />
          <div className="h-28 animate-pulse rounded-lg bg-neutral-900" />
          <div className="h-28 animate-pulse rounded-lg bg-neutral-900" />
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
