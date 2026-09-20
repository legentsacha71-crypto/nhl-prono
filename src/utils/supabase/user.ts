import { cache } from "react";
import { createClient } from "./server";

// getClaims() vérifie le JWT en local (clés publiques mises en cache) au lieu
// d'interroger Supabase Auth comme getUser() : un aller-retour réseau de
// moins à chaque changement d'onglet. cache() partage le résultat entre
// TopBar et la page pour une même requête. Réservé aux pages qui ne font que
// lire : les Server Actions qui modifient des données gardent getUser().
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  return {
    id: claims.sub,
    email: claims.email,
    user_metadata: claims.user_metadata,
  };
});
