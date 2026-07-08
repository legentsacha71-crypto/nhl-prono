import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getGameResult } from "@/lib/nhlResults";
import { getTeamStats, getLeagueAverageGoals } from "@/lib/nhlStats";
import {
  expectedGoals,
  scoreProbabilityGrid,
  calculatePoints,
} from "@/lib/scoring";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: ungraded, error } = await supabase
    .from("predictions")
    .select("game_id")
    .is("points", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const gameIds = [...new Set((ungraded ?? []).map((p) => p.game_id))];

  const stats = await getTeamStats();
  const leagueAvg = getLeagueAverageGoals(stats);

  let gradedGames = 0;
  let gradedPredictions = 0;

  for (const gameId of gameIds) {
    try {
      const result = await getGameResult(gameId);
      if (!result.isFinal) continue;

      const homeStats = stats.get(result.homeAbbrev);
      const awayStats = stats.get(result.awayAbbrev);
      if (!homeStats || !awayStats) continue;

      const { lambdaHome, lambdaAway } = expectedGoals(
        homeStats,
        awayStats,
        leagueAvg,
      );
      const grid = scoreProbabilityGrid(lambdaHome, lambdaAway);

      const { data: predictions, error: predError } = await supabase
        .from("predictions")
        .select("id, away_score, home_score")
        .eq("game_id", gameId)
        .is("points", null);

      if (predError || !predictions) continue;

      for (const prediction of predictions) {
        const points = calculatePoints({
          predictedHome: prediction.home_score,
          predictedAway: prediction.away_score,
          actualHome: result.regulationHomeScore,
          actualAway: result.regulationAwayScore,
          grid,
        });
        const isExactScore =
          prediction.home_score === result.regulationHomeScore &&
          prediction.away_score === result.regulationAwayScore;

        await supabase
          .from("predictions")
          .update({ points, is_exact_score: isExactScore })
          .eq("id", prediction.id);
        gradedPredictions++;
      }

      gradedGames++;
    } catch (err) {
      console.error(`Erreur lors du calcul du match ${gameId}:`, err);
    }
  }

  return NextResponse.json({ gradedGames, gradedPredictions });
}
