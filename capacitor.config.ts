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
};

export default config;
