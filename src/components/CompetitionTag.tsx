// Étiquette texte d'une compétition (« NHL », « Magnus »). Remplace les
// logos officiels de la NHL et de la Ligue Magnus, marques déposées qu'on
// n'affiche plus dans l'appli (risque de refus App Store, règle 5.2.1) :
// citer le nom d'une ligue suffit à dire de quoi on parle.
export type CompetitionKey = "nhl" | "magnus";

const STYLE: Record<CompetitionKey, { label: string; className: string }> = {
  nhl: { label: "NHL", className: "bg-neutral-100 text-neutral-900" },
  magnus: { label: "Magnus", className: "bg-sky-500/20 text-sky-200 ring-1 ring-sky-500/40" },
};

export default function CompetitionTag({
  competition,
  size = "sm",
}: {
  competition: CompetitionKey;
  size?: "xs" | "sm";
}) {
  const { label, className } = STYLE[competition];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded font-display uppercase leading-none tracking-wider ${className} ${
        size === "xs" ? "px-1 py-0.5 text-[10px]" : "px-1.5 py-1 text-xs"
      }`}
    >
      {label}
    </span>
  );
}
