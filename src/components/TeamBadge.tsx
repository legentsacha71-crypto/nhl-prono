import { getTeamColors } from "@/lib/nhlTeams";
import { getMagnusTeamColors } from "@/lib/magnusTeams";

type TeamBadgeProps = {
  abbrev: string;
  name?: string;
  size?: number;
  // "nhl" par défaut pour ne rien changer aux appels existants ; "magnus"
  // bascule sur la palette de couleurs des clubs de Ligue Magnus.
  league?: "nhl" | "magnus";
};

// Remplace le logo officiel de l'équipe par un badge aux deux couleurs du
// maillot (dégradé) + abréviation — évite toute reproduction de la
// propriété intellectuelle de la LNH tout en restant reconnaissable.
export default function TeamBadge({
  abbrev,
  name,
  size = 40,
  league = "nhl",
}: TeamBadgeProps) {
  const { primary, secondary } =
    league === "magnus" ? getMagnusTeamColors(abbrev) : getTeamColors(abbrev);

  return (
    <div
      title={name ?? abbrev}
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.32,
        background: `linear-gradient(135deg, ${primary} 50%, ${secondary} 50%)`,
        textShadow: "0 1px 2px rgba(0,0,0,0.7)",
      }}
    >
      {abbrev}
    </div>
  );
}
