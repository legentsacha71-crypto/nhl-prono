import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client "admin" : contourne les règles RLS, réservé aux jobs serveur
// (jamais utilisé pour une requête déclenchée par un utilisateur).
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
  );
}
