// Fin prévue de l'animation des points de l'accueil (PointsCounter) : sur
// l'accueil, l'alerte des nouveaux points (PointsToast) attend qu'elle soit
// finie pour ne pas annoncer le même gain deux fois en même temps.
let rollEndsAt = 0;

export function announceRoll(durationMs: number): void {
  rollEndsAt = Math.max(rollEndsAt, Date.now() + durationMs);
}

export function msUntilRollEnds(): number {
  return Math.max(0, rollEndsAt - Date.now());
}
