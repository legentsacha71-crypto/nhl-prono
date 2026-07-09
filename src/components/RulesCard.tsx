const RULES = [
  {
    icon: "🏒",
    title: "Pronostique le score",
    text: "Avant chaque match, indique le score exact que tu prédis.",
  },
  {
    icon: "🏆",
    title: "Bon vainqueur",
    text: "Tu marques des points — d'autant plus que l'équipe gagnante était outsider.",
  },
  {
    icon: "🎯",
    title: "Score exact",
    text: "Bonus en plus, encore plus gros si le score était improbable.",
  },
  {
    icon: "❌",
    title: "Mauvais vainqueur",
    text: "0 point, pas de demi-mesure.",
  },
];

export default function RulesCard() {
  return (
    <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-4 shadow-sm">
      <h2 className="mb-3 text-center text-sm font-semibold tracking-wide text-sky-400">
        Comment ça marche
      </h2>
      <ul className="space-y-3">
        {RULES.map((rule) => (
          <li key={rule.title} className="flex items-start gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-800 text-base">
              {rule.icon}
            </span>
            <span className="text-sm text-neutral-300">
              <span className="font-medium text-neutral-100">
                {rule.title}
              </span>{" "}
              — {rule.text}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
