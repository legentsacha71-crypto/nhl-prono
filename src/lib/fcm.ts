import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// Envoi de notifications push Android via Firebase Cloud Messaging (FCM),
// pendant qu'iOS passe par APNs (voir apns.ts). Contrairement à APNs, on ne
// réimplémente pas le protocole à la main ici : le SDK firebase-admin gère
// lui-même l'auth OAuth2 vers l'API FCM HTTP v1 à partir de la clé de
// compte de service générée dans la console Firebase (Project Settings >
// Service Accounts > Generate new private key).
//
// Comme pour apns.ts, sendFcmPush est "best effort" côté appelant : c'est
// push.ts (l'orchestrateur multi-plateformes) qui décide de logguer/ignorer
// les échecs plutôt que de faire planter l'action métier qui les déclenche.

export type FcmAlert = {
  title: string;
  body: string;
};

// Exporté : utilisé par push.ts pour décider s'il vaut la peine de tenter
// un envoi FCM pour un token Android, avant même d'appeler sendFcmPush.
export function isFcmConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

// Détail des variables d'env manquantes, pour un log exploitable côté
// Vercel quand isFcmConfigured() renvoie false (voir push.ts).
export function fcmMissingEnvVars(): string[] {
  return [
    !process.env.FIREBASE_PROJECT_ID && "FIREBASE_PROJECT_ID",
    !process.env.FIREBASE_CLIENT_EMAIL && "FIREBASE_CLIENT_EMAIL",
    !process.env.FIREBASE_PRIVATE_KEY && "FIREBASE_PRIVATE_KEY",
  ].filter((v): v is string => Boolean(v));
}

// Le SDK admin refuse d'être initialisé deux fois dans le même process :
// on met l'app en cache au niveau du module, comme le JWT APNs dans
// apns.ts, pour survivre à plusieurs invocations dans une même instance
// serverless. getApps() couvre aussi le cas (rare) où un hot-reload Next.js
// aurait déjà créé l'app par défaut.
let cachedApp: App | null = null;

function getFcmApp(): App {
  if (cachedApp) {
    return cachedApp;
  }
  const existingApps = getApps();
  if (existingApps.length > 0) {
    cachedApp = existingApps[0];
    return cachedApp;
  }

  const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY ?? "";
  // Même souci d'échappement que APNS_PRIVATE_KEY dans apns.ts : la clé du
  // compte de service est stockée sur une seule ligne côté Vercel, les \n
  // littéraux du champ private_key doivent être restaurés en vrais retours
  // à la ligne pour que le PEM soit valide.
  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  cachedApp = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
  return cachedApp;
}

// Erreur dédiée pour les tokens d'appareil que FCM signale comme invalides
// ou désinscrits (app désinstallée, token périmé...) : l'appelant (push.ts)
// s'en sert pour nettoyer la table device_push_tokens plutôt que de
// continuer à réessayer un token mort à chaque notification future.
export class FcmInvalidTokenError extends Error {}

export async function sendFcmPush(
  deviceToken: string,
  alert: FcmAlert,
): Promise<void> {
  const app = getFcmApp();
  try {
    await getMessaging(app).send({
      token: deviceToken,
      notification: { title: alert.title, body: alert.body },
    });
  } catch (err) {
    const code = (err as { code?: string } | undefined)?.code;
    if (
      code === "messaging/registration-token-not-registered" ||
      code === "messaging/invalid-registration-token"
    ) {
      throw new FcmInvalidTokenError(`FCM: ${code}`);
    }
    throw err;
  }
}
