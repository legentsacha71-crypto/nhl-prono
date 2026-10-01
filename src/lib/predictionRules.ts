// Score maximal accepté par équipe dans un pronostic. Aucun match de hockey
// ne s'en approche : au-delà, c'est une faute de frappe (ex. "32" au lieu
// de "3" puis "2"), qu'on refuse plutôt que d'enregistrer.
export const MAX_PREDICTED_SCORE = 20;
