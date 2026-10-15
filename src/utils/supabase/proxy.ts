import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PENDING_LEAGUE_COOKIE } from "@/lib/joinLeague";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT : ne rien exécuter entre createServerClient et getClaims().
  // Un appel ici pourrait invalider la session de l'utilisateur.
  // getClaims() vérifie le JWT en local (et rafraîchit la session si besoin)
  // sans aller-retour vers Supabase Auth à chaque requête.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const isAuthPage =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/signup");
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  // La politique de confidentialité et la page d'assistance doivent rester
  // accessibles sans connexion : ce sont les URLs fournies à Apple/Google
  // lors de la soumission de l'app (politique de confidentialité + support).
  // Lien d'invitation d'une ligue : ouvert sans connexion, il garde le code
  // le temps de l'inscription (voir src/app/rejoindre/[code]/route.ts).
  const isInviteLink = request.nextUrl.pathname.startsWith("/rejoindre/");
  // Retour de connexion Apple / Google (la session se crée là) et choix du
  // pseudo d'un compte tout neuf.
  const isAuthFlow =
    request.nextUrl.pathname.startsWith("/auth/") ||
    request.nextUrl.pathname.startsWith("/choisir-pseudo");
  const isPublicPage =
    request.nextUrl.pathname.startsWith("/confidentialite") ||
    request.nextUrl.pathname.startsWith("/assistance") ||
    request.nextUrl.pathname.startsWith("/auth/") ||
    isInviteLink;

  if (!user && !isAuthPage && !isApiRoute && !isPublicPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Invité qui vient de s'inscrire ou de se connecter : on finit de lui
  // faire rejoindre la ligue de son lien d'invitation.
  const pendingLeague = request.cookies.get(PENDING_LEAGUE_COOKIE)?.value;
  // Pas pendant le choix du pseudo : la ligue est rejointe juste après.
  if (user && pendingLeague && !isInviteLink && !isApiRoute && !isAuthFlow) {
    const url = request.nextUrl.clone();
    url.pathname = `/rejoindre/${encodeURIComponent(pendingLeague)}`;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Garder la session éventuellement rafraîchie par getClaims().
    supabaseResponse.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  }

  return supabaseResponse;
}
