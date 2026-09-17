import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { getGameResult } from "@/lib/gameResults";
import { isMagnusGameId } from "@/lib/competition";
import {
  getTeamStats as getNhlTeamStats,
  getLeagueAverageGoals as getNhlLeagueAverageGoals,
} from "@/lib/nhlStats";
import {
  getTeamStats as getMagnusTeamStats,
  getLeagueAverageGoals as getMagnusLeagueAverageGoals,
} from "@/lib/magnusStats";
import {
  expectedGoals,
  scoreProbabilityGrid,
  calculatePoints,
} from "@/lib/scoring";
import { sendPushToUser } from "@/lib/push";

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

  // NHL et Ligue Magnus ont chacune leur propre source de stats d'équipe :
  // on charge les deux une seule fois en parallèle, puis on choisit la
  // bonne paire stats/moyenne pour chaque match selon sa compétition (voir
  // isMagnusGameId). getGameResult (gameResults.ts) fait le même dispatch
  // côté résultat de match.
  const [nhlStats, magnusStats] = await Promise.all([
    getNhlTeamStats(),
    getMagnusTeamStats(),
  ]);
  const nhlLeagueAvg = getNhlLeagueAverageGoals(nhlStats);
  const magnusLeagueAvg = getMagnusLeagueAverageGoals(magnusStats);

  let gradedGames = 0;
  let gradedPredictions = 0;

  for (const gameId of gameIds) {
    try {
      const result = await getGameResult(gameId);
      if (!result.isFinal) continue;

      const isMagnus = isMagnusGameId(gameId);
      const stats = isMagnus ? magnusStats : nhlStats;
      const leagueAvg = isMagnus ? magnusLeagueAvg : nhlLeagueAvg;

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
        .select("id, user_id, away_score, home_score, boosted")
        .eq("game_id", gameId)
        .is("points", null);

      if (predError || !predictions) continue;

      for (const prediction of predictions) {
        const basePoints = calculatePoints({
          predictedHome: prediction.home_score,
          predictedAway: prediction.away_score,
          actualHome: result.regulationHomeScore,
          actualAway: result.regulationAwayScore,
          grid,
        });
        const points = prediction.boosted ? basePoints * 2 : basePoints;
        const isExactScore =
          prediction.home_score === result.regulationHomeScore &&
          prediction.away_score === result.regulationAwayScore;

        await supabase
          .from("predictions")
          .update({ points, is_exact_score: isExactScore })
          .eq("id", prediction.id);

        await supabase.from("notifications").insert({
          user_id: prediction.user_id,
          message: prediction.boosted
            ? `${result.awayAbbrev} @ ${result.homeAbbrev} : tu as gagné ${points} points (boost x2 🔥).`
            : `${result.awayAbbrev} @ ${result.homeAbbrev} : tu as gagné ${points} points.`,
        });

        // Notif push dédiée, en plus de la notif in-app ci-dessus, dès
        // qu'un pronostic tombe pile sur le score exact — best effort
        // (sendPushToUser ne fait jamais planter l'appelant, voir push.ts).
        if (isExactScore) {
          await sendPushToUser(prediction.user_id, {
            title: "WOOWW SCORE EXACT 🔥",
            body: `${result.awayAbbrev} @ ${result.homeAbbrev} : ${prediction.away_score}-${prediction.home_score}, ${points} points !`,
          });
        }

        gradedPredictions++;
      }

      gradedGames++;
    } catch (err) {
      console.error(`Erreur lors du calcul du match ${gameId}:`, err);
    }
  }

  return NextResponse.json({ gradedGames, gradedPredictions });
}
