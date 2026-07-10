type LogoProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

// Wordmark texte, pas une image — évite tout risque de marque déposée
// (contrairement à l'ancien logo-la-nuit-nhl.png qui reprenait le style
// typographique penché + étoile du logo officiel de la LNH).
const SIZES: Record<NonNullable<LogoProps["size"]>, string> = {
  sm: "text-xl",
  md: "text-3xl",
  lg: "text-4xl",
};

export default function Logo({ size = "md", className = "" }: LogoProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 font-black italic tracking-tight text-neutral-100 ${SIZES[size]} ${className}`}
    >
      <span>La Nuit</span>
      {/* pr-2 : le texte est en italic + bg-clip-text, la boîte de clip du
          dégradé ne tient pas compte de l'inclinaison des lettres, donc sans
          marge la dernière lettre ("y") se retrouve visuellement coupée à
          droite. */}
      <span className="bg-gradient-to-r from-sky-400 to-sky-300 bg-clip-text pr-2 text-transparent drop-shadow-[0_0_14px_rgba(56,189,248,0.35)]">
        Hockey
      </span>
    </span>
  );
}
