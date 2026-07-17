// Affiché instantanément par Next.js (via les fichiers loading.tsx) pendant
// que la page suivante se prépare côté serveur, à la place d'un écran figé.
export default function PageLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 p-6">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-sky-400" />
      <p className="text-sm text-neutral-500">Chargement…</p>
    </div>
  );
}
