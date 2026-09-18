// Service worker minimal, uniquement pour l'installabilité du site (Chrome
// Android). Aucune mise en cache : les pages dépendent de la session.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", () => {});
