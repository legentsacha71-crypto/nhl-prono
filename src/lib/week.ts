// Calcule une clé de semaine ISO (ex: "2026-W03") à partir d'une date.
// Utilisé pour limiter le boost x2 à un seul match par semaine : deux dates
// qui tombent dans la même semaine ISO (lundi-dimanche, en UTC) renvoient la
// même clé.
export function getWeekKey(iso: string): string {
  const date = new Date(iso);
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
  const dayNum = d.getUTCDay() || 7; // lundi = 1 ... dimanche = 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(
    ((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}
