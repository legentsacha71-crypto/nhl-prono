import { type NextRequest } from "next/server";
import { updateSession } from "@/utils/supabase/proxy";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // manifest.webmanifest et sw.js sont récupérés par le navigateur sans
    // cookie de session : ils ne doivent pas être redirigés vers /login.
    // api/calendar et api/live servent des données publiques (calendriers,
    // scores en direct) mises en cache par le CDN :
    // la session ne doit ni y être lue ni rafraîchie (pas de Set-Cookie).
    "/((?!_next/static|_next/image|favicon.ico|manifest\\.webmanifest|sw\\.js|api/calendar|api/live|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
