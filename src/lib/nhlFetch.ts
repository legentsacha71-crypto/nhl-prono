// L'API NHL est derrière Cloudflare, qui refuse ("429 Access denied", page
// HTML au lieu du JSON) les requêtes portant le user-agent par défaut de
// Node ("node"). Toute requête vers l'API NHL passe donc par ici pour
// s'identifier explicitement.
const NHL_API = "https://api-web.nhle.com/v1/";
const USER_AGENT = "LaNuitHockey/1.0 (+https://nhl-prono-drjd.vercel.app)";

export function nhlFetch(path: string, init: RequestInit = {}) {
  return fetch(NHL_API + path, {
    ...init,
    headers: { "User-Agent": USER_AGENT, ...init.headers },
  });
}
