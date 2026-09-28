import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getCurrentUser } from "@/utils/supabase/user";

// Pronostics du joueur notés sur les 7 derniers jours : PointsToast compare
// cette liste à celle déjà annoncée sur l'appareil pour afficher "+N pts".
export const dynamic = "force-dynamic";

const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("predictions")
    .select("id, points, is_exact_score")
    .eq("user_id", user.id)
    .not("points", "is", null)
    .gte("game_start_time", new Date(Date.now() - WINDOW_MS).toISOString());

  if (error) {
    return NextResponse.json({ error: "unavailable" }, { status: 500 });
  }

  return NextResponse.json({
    userId: user.id,
    items: (data ?? []).map((p) => ({
      id: String(p.id),
      points: p.points ?? 0,
      exact: Boolean(p.is_exact_score),
    })),
  });
}
