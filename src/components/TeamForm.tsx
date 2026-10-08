import type { CSSProperties } from "react";
import { FORM_LENGTH, type FormGame } from "@/lib/teamForm";

const GREEN = "#10b981"; // emerald-500
const RED = "#ef4444"; // red-500
const YELLOW = "#fbbf24"; // amber-400

// Victoire / défaite dans le temps réglementaire : pastille pleine. Match
// décidé en prolongation ou aux tirs au but (égalité après 60 min, comme
// pour les pronostics) : moitié verte ou rouge selon le vainqueur, moitié
// jaune, coupée en biais comme les badges d'équipe (TeamBadge).
type DotKind = "W" | "L" | "OTW" | "OTL";

export function dotKind(game: FormGame): DotKind {
  if (game.result === "W") return "W";
  if (game.result === "L") return "L";
  return game.teamScore > game.opponentScore ? "OTW" : "OTL";
}

const DOT_BACKGROUND: Record<DotKind, string> = {
  W: GREEN,
  L: RED,
  OTW: `linear-gradient(135deg, ${GREEN} 50%, ${YELLOW} 50%)`,
  OTL: `linear-gradient(135deg, ${RED} 50%, ${YELLOW} 50%)`,
};

const LABEL: Record<DotKind, string> = {
  W: "Victoire",
  L: "Défaite",
  OTW: "Victoire en prolongation",
  OTL: "Défaite en prolongation",
};

export function dotStyle(kind: DotKind): CSSProperties {
  return { background: DOT_BACKGROUND[kind] };
}

function describe(game: FormGame): string {
  const score = `${game.teamScore}-${game.opponentScore}`;
  const kind = dotKind(game);
  if (kind === "W" || kind === "L") {
    return `${LABEL[kind]} ${score} contre ${game.opponent}`;
  }
  const won = kind === "OTW" ? "Victoire" : "Défaite";
  const how = game.decidedIn === "SO" ? "aux tirs au but" : "en prolongation";
  return `${won} ${score} ${how} contre ${game.opponent}`;
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
        .map((g) => LABEL[dotKind(g)])
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
          className="h-2.5 w-2.5 rounded-full"
          style={dotStyle(dotKind(game))}
        />
      ))}
    </div>
  );
}
