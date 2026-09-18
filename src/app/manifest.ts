import type { MetadataRoute } from "next";

// Rend le site installable depuis Chrome Android ("Installer l'application") :
// icône sur l'écran d'accueil et ouverture plein écran, sans passer par le
// Play Store.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "La Nuit Hockey",
    short_name: "La Nuit Hockey",
    description: "Pronostics de scores de hockey entre amis",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["sports"],
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
