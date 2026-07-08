import { getTeamColors } from "@/lib/nhlTeams";

type TeamBadgeProps = {
  abbrev: string;
  name?: string;
  size?: number;
};

// Remplace le logo officiel de l'équipe par un badge aux deux couleurs du
// maillot (dégradé) + abréviation — évite toute reproduction de la
// propriété intellectuelle de la LNH tout en restant reconnaissable.
export default function TeamBadge({ abbrev, name, size = 40 }: TeamBadgeProps) {
  const { primary, secondary } = getTeamColors(abbrev);

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
