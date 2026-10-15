// Connexion avec Apple / Google (voir SocialLoginButtons.tsx).
// Les identifiants Google sont publics (ils figurent dans l'appli) ; tant
// que NEXT_PUBLIC_SOCIAL_LOGIN ne vaut pas "1", les boutons restent cachés.

export const SOCIAL_LOGIN_ENABLED = process.env.NEXT_PUBLIC_SOCIAL_LOGIN === "1";
export const GOOGLE_WEB_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
export const GOOGLE_IOS_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

// Après une connexion Apple / Google : choix du pseudo si le compte est
// nouveau, sinon l'appli (voir src/app/auth/suite/route.ts).
export const AFTER_SOCIAL_LOGIN = "/auth/suite";
