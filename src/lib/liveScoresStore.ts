import type { LiveScores } from "./liveTypes";

// Scores en direct partagés par toutes les cartes LiveScore de la page :
// une seule requête à /api/live toutes les 15 s, uniquement pendant qu'au
// moins une carte de match en cours est affichée et que l'onglet est
// visible (pas de requêtes en arrière-plan, appli fermée ou écran éteint).
const POLL_MS = 15_000;

let scores: LiveScores = {};
let timer: ReturnType<typeof setInterval> | null = null;
let inFlight = false;
const listeners = new Set<() => void>();

async function refresh() {
  if (inFlight || document.visibilityState !== "visible") return;
  inFlight = true;
  try {
    const res = await fetch("/api/live", { cache: "no-store" });
    if (res.ok) {
      scores = await res.json();
      listeners.forEach((listener) => listener());
    }
  } catch {
    // Réseau coupé : on garde les derniers scores, nouvel essai au prochain tour.
  } finally {
    inFlight = false;
  }
}

function onVisibility() {
  if (document.visibilityState === "visible") refresh();
}

export function subscribeLiveScores(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    refresh();
    timer = setInterval(refresh, POLL_MS);
    document.addEventListener("visibilitychange", onVisibility);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer) clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", onVisibility);
    }
  };
}

export function getLiveScores() {
  return scores;
}

const EMPTY: LiveScores = {};
export function getServerLiveScores() {
  return EMPTY;
}
