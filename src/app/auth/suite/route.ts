import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";

// Après une connexion Apple / Google : un compte tout neuf n'a pas encore de
// pseudo (choix du pseudo), un joueur sans prono passe par l'écran de
// bienvenue, les autres arrivent sur l'accueil.
export async function GET(request: NextRequest) {
  const to = (path: string) => NextResponse.redirect(new URL(path, request.url));
  const user = await getCurrentUser();
  if (!user) return to("/login");

  const supabase = await createClient();
  const [{ data: profile }, { count }] = await Promise.all([
    supabase.from("profiles").select("id").eq("id", user.id).maybeSingle(),
    supabase.from("predictions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);
  if (!profile) return to("/choisir-pseudo");
  return to(count === 0 ? "/bienvenue" : "/");
}
