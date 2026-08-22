import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getRanking } from "@/lib/ranking";
import { isMagnusGameId } from "@/lib/competition";

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
      .select("game_id, points, is_exact_score")
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

  // Ventilation par compétition pour l'onglet Stats du profil (bascule
  // NHL / Ligue Magnus) : dérivée du seul game_id, voir isMagnusGameId.
  const nhlAll = all.filter((p) => !isMagnusGameId(p.game_id));
  const nhlGraded = nhlAll.filter((p) => p.points !== null);
  const magnusAll = all.filter((p) => isMagnusGameId(p.game_id));
  const magnusGraded = magnusAll.filter((p) => p.points !== null);

  return NextResponse.json({
    points,
    rank,
    totalRanked: ranking.length,
    pronosCount: all.length,
    gradedCount: graded.length,
    correctCount,
    exactCount,
    nhl: {
      points: nhlGraded.reduce((sum, p) => sum + (p.points ?? 0), 0),
      pronosCount: nhlAll.length,
      gradedCount: nhlGraded.length,
      correctCount: nhlGraded.filter((p) => (p.points ?? 0) > 0).length,
      exactCount: nhlGraded.filter((p) => p.is_exact_score).length,
    },
    magnus: {
      points: magnusGraded.reduce((sum, p) => sum + (p.points ?? 0), 0),
      pronosCount: magnusAll.length,
      gradedCount: magnusGraded.length,
      correctCount: magnusGraded.filter((p) => (p.points ?? 0) > 0).length,
      exactCount: magnusGraded.filter((p) => p.is_exact_score).length,
    },
  });
}
