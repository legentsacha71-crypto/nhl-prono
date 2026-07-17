import type { TeamStats } from "./nhlStats";

const HOME_ADVANTAGE = 1.05;
const AWAY_DISADVANTAGE = 0.95;
const MAX_GOALS = 10;
const BASE_POINTS_CONSTANT = 30;

function factorial(n: number): number {
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function poissonPmf(k: number, lambda: number): number {
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

export function expectedGoals(
  home: TeamStats,
  away: TeamStats,
  leagueAvgGoals: number,
): { lambdaHome: number; lambdaAway: number } {
  const homeAttack = home.goalsForPerGame / leagueAvgGoals;
  const homeDefense = home.goalsAgainstPerGame / leagueAvgGoals;
  const awayAttack = away.goalsForPerGame / leagueAvgGoals;
  const awayDefense = away.goalsAgainstPerGame / leagueAvgGoals;

  return {
    lambdaHome: leagueAvgGoals * homeAttack * awayDefense * HOME_ADVANTAGE,
    lambdaAway: leagueAvgGoals * awayAttack * homeDefense * AWAY_DISADVANTAGE,
  };
}

export function scoreProbabilityGrid(
  lambdaHome: number,
  lambdaAway: number,
): number[][] {
  const grid: number[][] = [];
  for (let h = 0; h <= MAX_GOALS; h++) {
    grid[h] = [];
    for (let a = 0; a <= MAX_GOALS; a++) {
      grid[h][a] = poissonPmf(h, lambdaHome) * poissonPmf(a, lambdaAway);
    }
  }
  return grid;
}

export function outcomeProbabilities(grid: number[][]) {
  let homeWin = 0;
  let awayWin = 0;
  let draw = 0;
  for (let h = 0; h < grid.length; h++) {
    for (let a = 0; a < grid[h].length; a++) {
      if (h > a) homeWin += grid[h][a];
      else if (h < a) awayWin += grid[h][a];
      else draw += grid[h][a];
    }
  }
  return { homeWin, awayWin, draw };
}

function exactScoreBonus(probability: number): number {
  if (probability < 0.005) return 100;
  if (probability < 0.02) return 60;
  if (probability < 0.05) return 30;
  if (probability < 0.1) return 10;
  return 5;
}

// Aperçu des points gagnables en pariant sur le bon vainqueur, affiché avant
// le match sur la page des pronostics (même formule que calculatePoints,
// mais sans connaître le score final : juste base = 30 / probabilité).
export function estimateWinPoints(
  home: TeamStats,
  away: TeamStats,
  leagueAvgGoals: number,
): {
  homeWinProbability: number;
  awayWinProbability: number;
  drawProbability: number;
  homePoints: number;
  awayPoints: number;
  drawPoints: number;
} {
  const { lambdaHome, lambdaAway } = expectedGoals(home, away, leagueAvgGoals);
  const grid = scoreProbabilityGrid(lambdaHome, lambdaAway);
  const { homeWin, awayWin, draw } = outcomeProbabilities(grid);

  return {
    homeWinProbability: homeWin,
    awayWinProbability: awayWin,
    drawProbability: draw,
    homePoints: Math.round(BASE_POINTS_CONSTANT / homeWin),
    awayPoints: Math.round(BASE_POINTS_CONSTANT / awayWin),
    drawPoints: Math.round(BASE_POINTS_CONSTANT / draw),
  };
}

export function calculatePoints({
  predictedHome,
  predictedAway,
  actualHome,
  actualAway,
  grid,
}: {
  predictedHome: number;
  predictedAway: number;
  actualHome: number;
  actualAway: number;
  grid: number[][];
}): number {
  const { homeWin, awayWin, draw } = outcomeProbabilities(grid);

  const predictedOutcome =
    predictedHome > predictedAway
      ? "home"
      : predictedHome < predictedAway
        ? "away"
        : "draw";
  const actualOutcome =
    actualHome > actualAway ? "home" : actualHome < actualAway ? "away" : "draw";

  if (predictedOutcome !== actualOutcome) {
    return 0;
  }

  const outcomeProbability =
    actualOutcome === "home" ? homeWin : actualOutcome === "away" ? awayWin : draw;

  const basePoints = Math.round(BASE_POINTS_CONSTANT / outcomeProbability);

  const isExactScore =
    predictedHome === actualHome && predictedAway === actualAway;
  if (!isExactScore) {
    return basePoints;
  }

  const clampedH = Math.min(actualHome, MAX_GOALS);
  const clampedA = Math.min(actualAway, MAX_GOALS);
  const exactScoreProbability = grid[clampedH]?.[clampedA] ?? 0;

  return basePoints + exactScoreBonus(exactScoreProbability);
}
