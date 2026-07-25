export type PlayerStats = {
  points: number;
  rank: number;
  totalRanked: number;
  pronosCount: number;
  gradedCount: number;
  correctCount: number;
  exactCount: number;
};

type PlayerStatsSummaryProps = {
  stats: PlayerStats;
  // "EN DIRECT" + pulsation : uniquement pertinent pour son propre profil,
  // où ProfileStatsPanel fait du polling. Sur le profil d'un autre joueur,
  // l'affichage est statique (rendu serveur, pas de rafraîchissement).
  live?: boolean;
  pulse?: boolean;
};

// Contenu visuel partagé entre l'onglet Stats de son propre profil
// (ProfileStatsPanel, avec polling) et la vue en lecture seule du profil
// d'un autre joueur (statique).
export default function PlayerStatsSummary({
  stats,
  live = false,
  pulse = false,
}: PlayerStatsSummaryProps) {
  const successRate = stats.gradedCount
    ? Math.round((stats.correctCount / stats.gradedCount) * 100)
    : 0;
  const exactRate = stats.gradedCount
    ? Math.round((stats.exactCount / stats.gradedCount) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-neutral-800 bg-gradient-to-b from-sky-500/10 to-neutral-900 p-6 text-center shadow-lg shadow-black/20">
        {live && (
          <p className="flex items-center justify-center gap-1.5 text-xs font-medium tracking-wide text-neutral-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            EN DIRECT
          </p>
        )}
        <p
          className={`font-display text-7xl leading-none tracking-wide text-sky-400 transition-transform duration-300 ${
            pulse ? "scale-110" : "scale-100"
          }`}
        >
          {stats.points}
        </p>
        <p className="mt-1 text-xs uppercase tracking-widest text-neutral-500">
          points
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-md shadow-black/20">
          <p className="text-lg font-bold text-sky-400">{stats.pronosCount}</p>
          <p className="text-xs text-neutral-500">Pronos</p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-md shadow-black/20">
          <p className="text-lg font-bold text-emerald-400">
            {stats.correctCount}
          </p>
          <p className="text-xs text-neutral-500">Bons pronos</p>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-md shadow-black/20">
          <p className="text-lg font-bold text-sky-400">{stats.exactCount}</p>
          <p className="text-xs text-neutral-500">
            {stats.exactCount > 1 ? "Scores exacts" : "Score exact"}
          </p>
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-medium tracking-wide text-neutral-500 uppercase">
          Précision
        </h3>
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-md shadow-black/20">
            <p className="text-xl font-bold text-sky-400">{successRate}%</p>
            <p className="text-xs text-neutral-500">Taux de réussite</p>
          </div>
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 p-3 shadow-md shadow-black/20">
            <p className="text-xl font-bold text-sky-400">{exactRate}%</p>
            <p className="text-xs text-neutral-500">Taux de score exact</p>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-neutral-800 bg-gradient-to-r from-sky-500/10 to-neutral-900 p-4 text-center shadow-lg shadow-black/20">
        <p className="text-sm text-neutral-400">🏆 Classement général</p>
        <p className="text-lg font-medium text-neutral-100">
          {stats.rank > 0
            ? `#${stats.rank} sur ${stats.totalRanked}`
            : "Pas encore classé"}
        </p>
      </div>
    </div>
  );
}
