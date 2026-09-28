// Pages sans barre du bas ni annonce de points : connexion, inscription, et
// les deux pages publiques fournies à Apple/Google (accessibles sans compte).
const PUBLIC_PREFIXES = ["/login", "/signup", "/confidentialite", "/assistance"];

export function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
