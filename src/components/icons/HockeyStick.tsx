import { createLucideIcon } from "lucide-react";

// Lucide n'a pas de crosse de hockey : icône dessinée dans le même style
// (trait de 2, bouts arrondis) pour l'onglet Matchs, avec les mêmes props
// que les icônes Lucide (size, className, strokeWidth...).
const HockeyStick = createLucideIcon("HockeyStick", [
  [
    "path",
    {
      d: "m19 2-8.2 13.1a3 3 0 0 1-2.5 1.4H4.5a1.5 1.5 0 0 0 0 3h4a4 4 0 0 0 3.4-1.9L20.5 4",
      key: "stick",
    },
  ],
  ["ellipse", { cx: "17", cy: "20", rx: "3", ry: "1.2", key: "puck" }],
]);

export default HockeyStick;
