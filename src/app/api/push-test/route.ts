import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { isApnsConfigured, sendApnsPush } from "@/lib/apns";
import { isFcmConfigured, sendFcmPush } from "@/lib/fcm";

// Diagnostic des notifications, protégé comme les crons : envoie une notif de
// test à chaque appareil d'un joueur et renvoie, appareil par appareil, la
// réponse d'Apple ou de Firebase, que sendPushToUser (push.ts) avale
// volontairement pour ne jamais casser l'appelant.
//   curl -H "Authorization: Bearer $CRON_SECRET" ".../api/push-test?user=<id>"
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const userId = request.nextUrl.searchParams.get("user");
  if (!userId) {
    return NextResponse.json({ error: "Paramètre user manquant" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: tokens, error } = await supabase
    .from("device_push_tokens")
    .select("token, platform, updated_at")
    .eq("user_id", userId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const alert = {
    title: "Test de notification ✅",
    body: "Les notifications de La Nuit Hockey marchent sur ce téléphone.",
  };
  const results = await Promise.all(
    (tokens ?? []).map(async ({ token, platform, updated_at }) => {
      const android = platform === "android";
      if (android ? !isFcmConfigured() : !isApnsConfigured()) {
        return { platform, updated_at, result: "clés d'envoi absentes" };
      }
      try {
        if (android) await sendFcmPush(token, alert, { url: "/notifications" });
        else await sendApnsPush(token, alert, { url: "/notifications" });
        return { platform, updated_at, result: "ok" };
      } catch (err) {
        const name = err instanceof Error ? err.constructor.name : "Erreur";
        const message = err instanceof Error ? err.message : String(err);
        return { platform, updated_at, result: `${name}: ${message}` };
      }
    }),
  );

  return NextResponse.json({ devices: results });
}
