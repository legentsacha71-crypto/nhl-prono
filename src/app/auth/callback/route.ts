import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { AFTER_SOCIAL_LOGIN } from "@/lib/socialLogin";

// Retour de la connexion Google sur le site (redirection OAuth) : on
// échange le code contre une session, puis suite du parcours.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(AFTER_SOCIAL_LOGIN, request.url));
  }
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent("Connexion avec Google impossible, réessaie.")}`, request.url),
  );
}
