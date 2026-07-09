import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
