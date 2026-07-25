// Petite pastille avatar réutilisée dans les classements (général et par
// ligue). Même logique de repli (initiale) que sur les pages de profil,
// mais en plus petit et sans anneau de palier.
export default function RankAvatar({
  avatarUrl,
  username,
}: {
  avatarUrl: string | null;
  username: string;
}) {
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl}
        alt=""
        className="h-8 w-8 shrink-0 rounded-full border border-neutral-700 object-cover"
      />
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-gradient-to-br from-neutral-800 to-neutral-900 text-xs font-bold text-neutral-400">
      {username.slice(0, 1).toUpperCase()}
    </div>
  );
}
