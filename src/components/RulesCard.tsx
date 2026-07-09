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
    <div className="w-full max-w-md rounded-xl border border-neutral-800 bg-neutral-900 p-4 shadow-lg shadow-black/20 transition-shadow hover:shadow-black/30">
      <h2 className="mb-3 text-center text-sm font-semibold tracking-wide text-sky-400">
        Comment ça marche
      </h2>
      <ul className="space-y-3">
        {RULES.map((rule) => (
          <li
            key={rule.title}
            className="-mx-1.5 flex items-start gap-3 rounded-lg px-1.5 py-1 transition-colors duration-150 hover:bg-neutral-800/50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-neutral-800 to-neutral-900 text-base shadow-inner ring-1 ring-neutral-700/50">
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
