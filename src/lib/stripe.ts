import Stripe from "stripe";

// Client Stripe créé à la demande plutôt qu'au chargement du module : le SDK
// Stripe rejette une clé vide dès la construction, ce qui ferait planter le
// build Next.js (collecte des routes) tant que STRIPE_SECRET_KEY n'est pas
// définie. `stripe` n'est donc évalué qu'au moment où une action/route
// l'utilise réellement, jamais pendant le build. La clé secrète vit dans
// STRIPE_SECRET_KEY (Vercel + .env.local), jamais commitée.
let cachedStripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!cachedStripe) {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
      throw new Error("STRIPE_SECRET_KEY n'est pas configurée.");
    }
    cachedStripe = new Stripe(apiKey);
  }
  return cachedStripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return getStripe()[prop as keyof Stripe];
  },
});

// URL publique du site, utilisée pour les redirections Stripe (succès,
// annulation, retour du portail de facturation). Se rabat sur l'URL de prod
// si la variable n'est pas définie.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://nhl-prono-drjd.vercel.app";
