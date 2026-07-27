import { getRingForPoints } from "@/lib/profileRings";

// Petite pastille avatar réutilisée dans les classements (général et par
// ligue). Même logique de repli (initiale) que sur les pages de profil.
// `points`, si fourni, affiche l'anneau de palier autour de l'avatar — même
// visuel que sur les pages de profil (RingInfoBadge), pour que le
// classement rappelle visuellement la progression par paliers plutôt que
// d'être une simple liste de chiffres. `size` permet de l'agrandir pour le
// podium des 3 premiers.
export default function RankAvatar({
  avatarUrl,
  username,
  points,
  size = 32,
}: {
  avatarUrl: string | null;
  username: string;
  points?: number;
  size?: number;
}) {
  const ring = points != null ? getRingForPoints(points) : null;
  // Ratio identique à celui utilisé sur les pages de profil (96px d'avatar
  // dans un anneau de 112px), pour que l'anneau reste bien visible autour
  // du cercle plutôt que de l'écraser.
  const innerSize = ring ? Math.round(size * 0.857) : size;

  const avatar = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt=""
      style={{ width: innerSize, height: innerSize }}
      className="shrink-0 rounded-full border border-neutral-700 object-cover"
    />
  ) : (
    <div
      style={{
        width: innerSize,
        height: innerSize,
        fontSize: innerSize * 0.4,
      }}
      className="flex shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-gradient-to-br from-neutral-800 to-neutral-900 font-bold text-neutral-400"
    >
      {username.slice(0, 1).toUpperCase()}
    </div>
  );

  if (!ring) return avatar;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div className="absolute inset-0 flex items-center justify-center">
        {avatar}
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ring.image}
        alt=""
        className="pointer-events-none absolute inset-0 h-full w-full object-contain"
      />
    </div>
  );
}
