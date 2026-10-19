// Catégories de notifications push, réglables une à une par chaque joueur
// (page /notifications/reglages). Les choix sont rangés dans les
// métadonnées du compte Supabase (user_metadata.notif_prefs) : pas de table
// à créer. Une catégorie absente vaut « activée ».

export const PUSH_CATEGORIES = [
  {
    id: "reminders",
    label: "Rappels avant les matchs",
    description: "1 h avant un match pas encore pronostiqué, et à 13 h les jours de match.",
  },
  {
    id: "recap",
    label: "Récap du matin",
    description: "Vers 9 h : tes points de la nuit et ta place dans tes ligues.",
  },
  {
    id: "results",
    label: "Scores exacts",
    description: "Dès que tu trouves le score exact d'un match.",
  },
  {
    id: "leagues",
    label: "Classement des ligues",
    description: "Quand un joueur te passe devant dans une de tes ligues.",
  },
  {
    id: "chat",
    label: "Messages des ligues",
    description: "Quand le chat d'une de tes ligues se réveille.",
  },
  {
    id: "friends",
    label: "Amis",
    description: "Demandes d'ami reçues et acceptées.",
  },
  {
    id: "news",
    label: "Nouveautés de l'appli",
    description: "Les annonces de La Nuit Hockey, rarement.",
  },
] as const;

export type PushCategory = (typeof PUSH_CATEGORIES)[number]["id"];

export type NotifPrefs = Partial<Record<PushCategory, boolean>>;

export const NOTIF_PREFS_KEY = "notif_prefs";

export function isPushCategory(value: string): value is PushCategory {
  return PUSH_CATEGORIES.some((c) => c.id === value);
}

export function readNotifPrefs(userMetadata: unknown): NotifPrefs {
  const raw = (userMetadata as Record<string, unknown> | null | undefined)?.[NOTIF_PREFS_KEY];
  return raw && typeof raw === "object" ? (raw as NotifPrefs) : {};
}

export function pushAllowed(prefs: NotifPrefs | undefined, category: PushCategory): boolean {
  return prefs?.[category] !== false;
}
