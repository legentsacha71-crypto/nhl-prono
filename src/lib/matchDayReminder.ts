import { isMagnusGameId } from "./competition";

// Rappel quotidien de 13 h (route /api/notify-match-day) : quels matchs
// compter et quel texte envoyer. Séparé de la route pour pouvoir être vérifié
// sans rien envoyer.

type ReminderGame = { id: number; startTimeUTC: string; isProvisional?: boolean };

const PARIS_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });
const PARIS_HOUR = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Paris",
  hour: "numeric",
  hourCycle: "h23",
});

function nextDateKey(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}

// Les matchs "de ce soir", vus de France : ceux d'aujourd'hui (Ligue Magnus
// vers 20 h) et la nuit NHL qui suit (1 h à 5 h du matin, donc la date du
// lendemain), jusqu'à demain midi. Seuls les matchs confirmés et pas encore
// commencés comptent.
export function tonightGames<T extends ReminderGame>(games: T[], now = new Date()): T[] {
  const today = PARIS_DATE.format(now);
  const tomorrow = nextDateKey(today);
  return games.filter((g) => {
    if (g.isProvisional) return false;
    const start = new Date(g.startTimeUTC);
    if (start.getTime() <= now.getTime()) return false;
    const day = PARIS_DATE.format(start);
    if (day === today) return true;
    return day === tomorrow && Number(PARIS_HOUR.format(start)) < 12;
  });
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n > 1 ? "s" : ""}`;
}

// Texte du rappel pour un joueur à qui il reste `remaining` matchs à
// pronostiquer sur `games`.
export function reminderMessage(
  games: ReminderGame[],
  remaining: number,
): { title: string; body: string } {
  const magnus = games.filter((g) => isMagnusGameId(g.id)).length;
  const nhl = games.length - magnus;
  const title = "🏒 C'est l'heure des pronos !";

  if (remaining < games.length) {
    return {
      title,
      body: `Il te reste ${plural(remaining, "match")} à pronostiquer ce soir 👀`,
    };
  }
  const program =
    nhl > 0 && magnus > 0
      ? `${plural(magnus, "match")} de Ligue Magnus et ${plural(nhl, "match")} NHL ce soir`
      : magnus > 0
        ? `${plural(magnus, "match")} de Ligue Magnus ce soir`
        : `${plural(nhl, "match")} NHL cette nuit`;
  return { title, body: `${program} : fais tes pronos avant le coup d'envoi !` };
}
