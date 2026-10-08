import { FORM_LENGTH, type FormGame, type FormResult } from "@/lib/teamForm";

const COLOR: Record<FormResult, string> = {
  W: "bg-emerald-500",
  L: "bg-red-500",
  D: "bg-amber-400",
};

const LABEL: Record<FormResult, string> = {
  W: "Victoire",
  L: "Défaite",
  D: "Égalité après 60 min",
};

function describe(game: FormGame): string {
  const score = `${game.teamScore}-${game.opponentScore}`;
  if (game.result !== "D") return `${LABEL[game.result]} ${score} contre ${game.opponent}`;
  const won = game.teamScore > game.opponentScore;
  const how = game.decidedIn === "SO" ? "aux tirs au but" : "en prolongation";
  return `${LABEL.D} : ${won ? "victoire" : "défaite"} ${score} ${how} contre ${game.opponent}`;
}

// Les 5 derniers matchs d'une équipe, du plus ancien (à gauche) au plus
// récent (à droite). En début de saison, les matchs pas encore joués
// restent des ronds vides.
export default function TeamForm({ games }: { games?: FormGame[] }) {
  const recent = (games ?? []).slice(-FORM_LENGTH);
  if (recent.length === 0) return null;
  const missing = FORM_LENGTH - recent.length;

  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`${recent.length} derniers matchs, du plus ancien au plus récent : ${recent
        .map((g) => LABEL[g.result])
        .join(", ")}`}
    >
      {Array.from({ length: missing }, (_, i) => (
        <span
          key={`vide-${i}`}
          className="h-2.5 w-2.5 rounded-full border border-neutral-700"
        />
      ))}
      {recent.map((game) => (
        <span
          key={game.startTimeUTC}
          title={describe(game)}
          className={`h-2.5 w-2.5 rounded-full ${COLOR[game.result]}`}
        />
      ))}
    </div>
  );
}

// Légende affichée une fois en haut de la liste "À venir".
export function TeamFormLegend() {
  return (
    <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-neutral-500">
      <span>5 derniers matchs :</span>
      {(["W", "L", "D"] as const).map((r) => (
        <span key={r} className="inline-flex items-center gap-1">
          <span className={`h-2 w-2 rounded-full ${COLOR[r]}`} />
          {LABEL[r]}
        </span>
      ))}
    </p>
  );
}
