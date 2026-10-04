// Score en direct d'un match, servi par /api/live et affiché par LiveScore.
export type LiveGame = {
  // "LIVE" (en cours), "OFF" (terminé) ; les autres états ne sont pas servis.
  state: "LIVE" | "OFF";
  home: number | null;
  away: number | null;
  // Ex. "3e période · 19:44", "Entracte", "Prolongation" (NHL uniquement).
  detail?: string;
};

export type LiveScores = Record<string, LiveGame>;
