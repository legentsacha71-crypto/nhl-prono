import { getTeamStats, getLeagueAverageGoals } from "../src/lib/nhlStats";
import {
  expectedGoals,
  scoreProbabilityGrid,
  outcomeProbabilities,
  calculatePoints,
} from "../src/lib/scoring";

async function main() {
  const stats = await getTeamStats();
  const leagueAvg = getLeagueAverageGoals(stats);

  const home = stats.get("COL")!;
  const away = stats.get("VAN")!;

  console.log(`Moyenne buts/match ligue : ${leagueAvg.toFixed(2)}`);
  console.log(`COL (domicile) : ${home.goalsForPerGame.toFixed(2)} BP, ${home.goalsAgainstPerGame.toFixed(2)} BC / match`);
  console.log(`VAN (extérieur) : ${away.goalsForPerGame.toFixed(2)} BP, ${away.goalsAgainstPerGame.toFixed(2)} BC / match`);

  const { lambdaHome, lambdaAway } = expectedGoals(home, away, leagueAvg);
  console.log(`\nButs attendus : COL ${lambdaHome.toFixed(2)} - VAN ${lambdaAway.toFixed(2)}`);

  const grid = scoreProbabilityGrid(lambdaHome, lambdaAway);
  const { homeWin, awayWin, draw } = outcomeProbabilities(grid);
  console.log(`\nProbabilités : COL gagne ${(homeWin * 100).toFixed(1)}% | Nul ${(draw * 100).toFixed(1)}% | VAN gagne ${(awayWin * 100).toFixed(1)}%`);

  const cases = [
    { predictedHome: 4, predictedAway: 2, actualHome: 4, actualAway: 2, label: "Score exact du favori (COL 4-2)" },
    { predictedHome: 3, predictedAway: 1, actualHome: 4, actualAway: 2, label: "Bon vainqueur (favori), mauvais score" },
    { predictedHome: 2, predictedAway: 3, actualHome: 2, actualAway: 3, label: "Score exact de l'outsider (VAN gagne 3-2)" },
    { predictedHome: 1, predictedAway: 3, actualHome: 2, actualAway: 3, label: "Bon vainqueur (outsider), mauvais score" },
    { predictedHome: 4, predictedAway: 2, actualHome: 2, actualAway: 4, label: "Mauvais vainqueur" },
  ];

  console.log("\n--- Exemples de points ---");
  for (const c of cases) {
    const points = calculatePoints({ ...c, grid });
    console.log(`${c.label} : ${points} pts`);
  }
}

main();
