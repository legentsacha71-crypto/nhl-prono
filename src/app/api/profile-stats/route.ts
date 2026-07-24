import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getRanking } from "@/lib/ranking";

// Toujours recalculé à la demande : c'est ce endpoint qui alimente le
// rafraîchissement "en direct" du gros compteur de points dans l'onglet
// Stats du profil (polling côté client, voir ProfileStatsPanel.tsx).
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [{ data: predictions }, ranking] = await Promise.all([
    supabase
      .from("predictions")
      .select("points, is_exact_score")
      .eq("user_id", user.id),
    getRanking(supabase),
  ]);

  const all = predictions ?? [];
  const graded = all.filter((p) => p.points !== null);
  const correctCount = graded.filter((p) => (p.points ?? 0) > 0).length;
  const exactCount = graded.filter((p) => p.is_exact_score).length;

  const rank = ranking.findIndex((entry) => entry.userId === user.id) + 1;
  const points =
    ranking.find((entry) => entry.userId === user.id)?.totalPoints ?? 0;

  return NextResponse.json({
    points,
    rank,
    totalRanked: ranking.length,
    pronosCount: all.length,
    gradedCount: graded.length,
    correctCount,
    exactCount,
  });
}
