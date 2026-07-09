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
      <span className="text-sky-400">Hockey</span>
      <span aria-hidden className="not-italic">
        🏒
      </span>
    </span>
  );
}
