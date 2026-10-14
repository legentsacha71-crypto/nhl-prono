// Date du dernier message vu dans le chat de chaque ligue, gardée sur
// l'appareil (localStorage) : sert aux pastilles "non lu". Pas besoin de
// la base pour ça ; sur un nouvel appareil, les messages récents
// apparaissent simplement comme non lus.
const KEY = "lnh-chat-seen";
const listeners = new Set<() => void>();

function read(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "{}") ?? {};
  } catch {
    return {};
  }
}

// Instantané pour useSyncExternalStore : la chaîne brute, stable tant
// qu'elle ne change pas.
export function getSeenSnapshot(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

export function subscribeSeen(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

export function isUnread(snapshot: string | null, leagueId: string, lastAt: string | null): boolean {
  if (!lastAt) return false;
  let seen: string | undefined;
  try {
    seen = (JSON.parse(snapshot ?? "{}") ?? {})[leagueId];
  } catch {
    seen = undefined;
  }
  return !seen || Date.parse(lastAt) > Date.parse(seen);
}

export function markSeen(leagueId: string, at: string) {
  const seen = read();
  if (seen[leagueId] && Date.parse(seen[leagueId]) >= Date.parse(at)) return;
  seen[leagueId] = at;
  try {
    localStorage.setItem(KEY, JSON.stringify(seen));
  } catch {
    return;
  }
  listeners.forEach((listener) => listener());
}
