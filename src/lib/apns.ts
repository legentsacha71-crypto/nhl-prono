import crypto from "node:crypto";
import http2 from "node:http2";

// Envoi de notifications push iOS (APNs) en "provider token" auth : un JWT
// signé avec la clé privée .p8 créée dans le Developer Portal Apple, plutôt
// qu'un certificat .p12 à renouveler chaque année. Implémenté à la main
// avec les modules natifs Node (`crypto` pour la signature ES256, `http2`
// pour parler à l'API Apple qui n'accepte QUE du HTTP/2, jamais du
// HTTP/1.1) : pas besoin d'ajouter de dépendance pour ça.
//
// Toutes les fonctions de ce fichier sont "best effort" côté appelant :
// elles ne doivent jamais faire planter l'action métier (demande d'ami,
// etc.) qui les déclenche. C'est à l'appelant de les envelopper dans un
// try/catch s'il veut logguer un échec, comme pour les notifications
// in-app existantes dans profil/actions.ts.

const APNS_HOST = "https://api.push.apple.com";
// Hôte "sandbox" historique. Apple a unifié les deux environnements sur
// api.push.apple.com depuis 2021, mais en pratique un token généré par un
// build signé en développement (aps-environment: development, ce qui peut
// arriver même via TestFlight selon le profil de provisionnement utilisé
// pour signer l'archive) est rejeté par l'hôte de prod avec l'erreur non
// documentée "BadEnvironmentKeyInToken". On retente alors sur cet hôte
// sandbox plutôt que de faire échouer l'envoi.
const APNS_HOST_SANDBOX = "https://api.sandbox.push.apple.com";

export type ApnsAlert = {
  title: string;
  body: string;
};

// Depuis février 2021, Apple unifie l'environnement sandbox/production sur
// le même host (api.push.apple.com) : il route automatiquement selon le
// token présenté. Plus besoin de distinguer TestFlight/dev vs App Store.
function isApnsConfigured(): boolean {
  return Boolean(
    process.env.APNS_KEY_ID &&
      process.env.APNS_TEAM_ID &&
      process.env.APNS_PRIVATE_KEY &&
      process.env.APNS_BUNDLE_ID,
  );
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Le token JWT "provider auth" d'APNs est valide jusqu'à 1h et Apple
// demande de ne pas en régénérer plus souvent que toutes les ~20 min. On
// le met en cache en mémoire (au niveau du module) et on le régénère
// seulement s'il a plus de 45 min, pour limiter les signatures inutiles
// entre deux appels dans la même instance de fonction serverless.
let cachedJwt: { token: string; issuedAt: number } | null = null;
const JWT_MAX_AGE_SECONDS = 45 * 60;

function buildApnsJwt(): string {
  const now = Math.floor(Date.now() / 1000);
  if (cachedJwt && now - cachedJwt.issuedAt < JWT_MAX_AGE_SECONDS) {
    return cachedJwt.token;
  }

  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const rawPrivateKey = process.env.APNS_PRIVATE_KEY ?? "";
  // La clé est stockée en variable d'env sur une seule ligne : les retours
  // à la ligne du fichier .p8 doivent être ré-échappés en \n littéral au
  // moment de la configurer sur Vercel, on les restaure ici.
  const privateKey = rawPrivateKey.replace(/\\n/g, "\n");

  const header = { alg: "ES256", kid: keyId };
  const payload = { iss: teamId, iat: now };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

  const signature = crypto.sign("sha256", Buffer.from(unsigned), {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });

  const jwt = `${unsigned}.${base64url(signature)}`;
  cachedJwt = { token: jwt, issuedAt: now };
  return jwt;
}

// Erreur dédiée pour les tokens d'appareil qu'Apple signale comme invalides
// ou désinscrits (app désinstallée, token périmé...) : l'appelant peut
// l'utiliser pour nettoyer la table device_push_tokens plutôt que de
// continuer à réessayer un token mort à chaque notification future.
export class ApnsInvalidTokenError extends Error {}

// Signale un mismatch d'environnement (cf. commentaire sur APNS_HOST_SANDBOX)
// pour que sendApnsPush puisse retenter sur l'autre hôte.
class ApnsWrongEnvironmentError extends Error {}

function sendApnsRequest(
  host: string,
  deviceToken: string,
  jwt: string,
  payload: unknown,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const bundleId = process.env.APNS_BUNDLE_ID as string;
    const client = http2.connect(host);

    client.on("error", (err) => {
      reject(err);
    });

    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${jwt}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "apns-priority": "10",
      "content-type": "application/json",
    });

    let status: number | undefined;
    let body = "";

    req.setEncoding("utf8");
    req.on("response", (headers) => {
      status = headers[":status"] as number;
    });
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      client.close();
      if (status === 200) {
        resolve();
        return;
      }
      let reason = body;
      try {
        reason = JSON.parse(body).reason ?? body;
      } catch {
        // body pas en JSON, on garde le texte brut
      }
      if (
        status === 410 ||
        reason === "BadDeviceToken" ||
        reason === "Unregistered"
      ) {
        reject(new ApnsInvalidTokenError(`APNs: ${reason}`));
      } else if (reason === "BadEnvironmentKeyInToken") {
        reject(new ApnsWrongEnvironmentError(`APNs: ${reason}`));
      } else {
        reject(new Error(`APNs error ${status}: ${reason}`));
      }
    });
    req.on("error", (err) => {
      client.close();
      reject(err);
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

export async function sendApnsPush(
  deviceToken: string,
  alert: ApnsAlert,
): Promise<void> {
  const jwt = buildApnsJwt();
  const payload = { aps: { alert, sound: "default" } };
  try {
    await sendApnsRequest(APNS_HOST, deviceToken, jwt, payload);
  } catch (err) {
    if (!(err instanceof ApnsWrongEnvironmentError)) {
      throw err;
    }
    await sendApnsRequest(APNS_HOST_SANDBOX, deviceToken, jwt, payload);
  }
}

// Point d'entrée à utiliser depuis les server actions / routes API : envoie
// la notif à tous les appareils enregistrés d'un utilisateur (potentiellement
// plusieurs iPhones), nettoie les tokens qu'Apple signale comme invalides,
// et ne fait jamais planter l'appelant (best effort, comme les notifs
// in-app déjà en place).
export async function sendPushToUser(
  userId: string,
  alert: ApnsAlert,
): Promise<void> {
  if (!isApnsConfigured()) {
    // Silencieux par design pour ne jamais casser l'appelant, mais on log
    // quand même quelles variables manquent : sans ça, une config Vercel
    // incomplète ne produit aucune trace nulle part et est indébuggable.
    const missing = [
      !process.env.APNS_KEY_ID && "APNS_KEY_ID",
      !process.env.APNS_TEAM_ID && "APNS_TEAM_ID",
      !process.env.APNS_PRIVATE_KEY && "APNS_PRIVATE_KEY",
      !process.env.APNS_BUNDLE_ID && "APNS_BUNDLE_ID",
    ].filter(Boolean);
    console.error(
      `Push APNs non configuré, variables manquantes : ${missing.join(", ")}`,
    );
    return;
  }

  // Import différé pour éviter tout cycle d'import avec admin.ts, qui n'a
  // pas besoin de connaître ce module.
  const { createAdminClient } = await import("@/utils/supabase/admin");
  const admin = createAdminClient();

  const { data: tokens } = await admin
    .from("device_push_tokens")
    .select("token")
    .eq("user_id", userId);

  if (!tokens || tokens.length === 0) {
    return;
  }

  await Promise.all(
    tokens.map(async ({ token }) => {
      try {
        await sendApnsPush(token, alert);
      } catch (err) {
        if (err instanceof ApnsInvalidTokenError) {
          await admin.from("device_push_tokens").delete().eq("token", token);
        } else {
          console.error("Échec de l'envoi d'une notification push :", err);
        }
      }
    }),
  );
}
