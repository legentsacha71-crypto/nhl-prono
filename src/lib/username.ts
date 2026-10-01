// Règles de pseudo partagées par l'inscription (login/actions.ts) et le
// changement de pseudo (profil/actions.ts).
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;

// ilike traite "%" et "_" comme des jokers : on les échappe pour comparer le
// pseudo tel quel (sinon "Zora_bgs" bloquerait aussi "ZoraXbgs").
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, "\\$&");
}
