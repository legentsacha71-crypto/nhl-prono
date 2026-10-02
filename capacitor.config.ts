import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.lanuithockey.app",
  appName: "La Nuit Hockey",
  // Dossier requis par l'outillage Capacitor, mais non utilisé au runtime :
  // voir server.url ci-dessous.
  webDir: "capacitor-www",
  server: {
    // L'app native charge directement le site en production dans une
    // WebView plutôt que d'embarquer une build statique : "La Nuit Hockey"
    // dépend de Server Actions, de l'auth par cookies et de routes
    // dynamiques (cron de notation, appels API NHL côté serveur...) qui ne
    // fonctionnent pas avec `next export`.
    url: "https://nhl-prono-drjd.vercel.app",
    cleartext: false,
  },
  // Fond de la WebView = fond de l'appli (#0a0a0a) : plus de flash blanc
  // pendant le chargement du site.
  backgroundColor: "#0a0a0a",
  plugins: {
    // Écran de lancement (logo sur fond sombre) gardé affiché jusqu'à ce que
    // le site ait chargé : HideNativeSplash.tsx le masque dès le premier
    // rendu. launchShowDuration ne sert que de filet (réseau absent) : il
    // se ferme de lui-même au bout de 10 s.
    SplashScreen: {
      launchShowDuration: 10000,
      launchAutoHide: true,
      launchFadeOutDuration: 250,
      backgroundColor: "#0a0a0a",
      showSpinner: false,
      androidScaleType: "CENTER_CROP",
    },
  },
};

export default config;
