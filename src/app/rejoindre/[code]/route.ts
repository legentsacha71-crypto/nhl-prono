import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";
import { joinLeagueByCode, PENDING_LEAGUE_COOKIE } from "@/lib/joinLeague";

// Lien d'invitation d'une ligue (bouton Inviter) : /rejoindre/<code>.
// Connecté : on rejoint la ligue et on l'ouvre. Pas connecté : le code est
// gardé dans un cookie le temps de l'inscription ou de la connexion, puis
// proxy.ts renvoie ici pour finir (dans l'appli, ce lien ouvre l'appli
// directement, voir NativeLinks.tsx).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code: raw } = await params;
  const code = decodeURIComponent(raw).trim().toUpperCase().slice(0, 12);
  const to = (path: string) => new URL(path, request.url);

  const user = await getCurrentUser();
  if (!user) {
    const response = NextResponse.redirect(to("/signup?invitation=1"));
    response.cookies.set(PENDING_LEAGUE_COOKIE, code, {
      maxAge: 7 * 24 * 60 * 60,
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
    });
    return response;
  }

  const supabase = await createClient();
  const result = await joinLeagueByCode(supabase, user.id, code);

  let destination: string;
  if (!result.ok) {
    destination = `/leagues?error=${encodeURIComponent(result.error)}`;
  } else {
    // Nouveau joueur sans aucun prono : l'écran de bienvenue d'abord.
    const { count } = await supabase
      .from("predictions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    destination = count === 0 ? `/bienvenue?ligue=${result.leagueId}` : `/leagues/${result.leagueId}`;
  }

  const response = NextResponse.redirect(to(destination));
  response.cookies.delete(PENDING_LEAGUE_COOKIE);
  return response;
}
