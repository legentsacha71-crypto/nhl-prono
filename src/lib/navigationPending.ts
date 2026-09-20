// Onglet vers lequel on navigue (null = aucune navigation en cours). Petit
// store partagé entre BottomNav (qui le renseigne au tap) et
// NavigationOverlay (qui affiche le squelette et l'efface à l'arrivée).
let pendingHref: string | null = null;
const listeners = new Set<() => void>();

export function setPendingHref(href: string | null) {
  if (pendingHref === href) return;
  pendingHref = href;
  listeners.forEach((listener) => listener());
}

export function getPendingHref() {
  return pendingHref;
}

export function subscribePendingHref(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
