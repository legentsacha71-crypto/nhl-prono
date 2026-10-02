import type { NextConfig } from "next";

// Photos de profil (bucket Supabase "avatars") : redimensionnées par
// l'optimiseur d'images à la taille affichée (pastilles de 32 à 96 px) au
// lieu d'être téléchargées en taille réelle, jusqu'à plusieurs Mo chacune.
// Le ?t= ajouté à chaque nouvelle photo (voir uploadAvatar) change l'URL,
// d'où un cache long sans risque d'afficher une ancienne photo.
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : null;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseHost
      ? [
          {
            protocol: "https",
            hostname: supabaseHost,
            pathname: "/storage/v1/object/public/avatars/**",
          },
        ]
      : [],
    minimumCacheTTL: 2678400,
  },
  experimental: {
    serverActions: {
      // Next.js limite les requêtes de Server Actions à 1 Mo par défaut.
      // Les photos de profil sont acceptées jusqu'à 3 Mo côté app
      // (voir MAX_AVATAR_SIZE dans src/app/profil/actions.ts) : sans cette
      // limite relevée, un upload de 1 à 3 Mo est silencieusement rejeté
      // par Next.js avant même d'atteindre notre code (aucune erreur
      // visible pour l'utilisateur).
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
