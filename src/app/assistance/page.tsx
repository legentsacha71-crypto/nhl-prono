import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = {
  title: "Assistance — La Nuit Hockey",
};

const FAQ = [
  {
    question: "Comment créer ou rejoindre une ligue ?",
    answer:
      "Depuis l'app, rends-toi dans l'onglet Ligues. Tu peux créer une nouvelle ligue privée (un code d'invitation est généré automatiquement) ou rejoindre une ligue existante en entrant le code que t'a partagé un ami.",
  },
  {
    question: "J'ai oublié mon mot de passe, comment faire ?",
    answer:
      "Sur l'écran de connexion, utilise le lien \"Mot de passe oublié\" pour recevoir un email de réinitialisation à l'adresse associée à ton compte.",
  },
  {
    question: "Comment modifier ou supprimer mon pronostic ?",
    answer:
      "Tant que le match n'a pas commencé, il te suffit de retaper le score dans l'appli : il est sauvegardé automatiquement. Une fois le match commencé, le pronostic est verrouillé et ne peut plus être modifié.",
  },
  {
    question: "Comment supprimer mon compte ?",
    answer:
      "Depuis la page Profil de l'app, une option permet de supprimer définitivement ton compte et tes données associées.",
  },
  {
    question: "Je vois une erreur ou un score incorrect, que faire ?",
    answer:
      "Les matchs et scores proviennent de l'API officielle de la LNH ; en cas d'écart temporaire (match en cours, mise à jour en retard), l'affichage se corrige généralement en quelques minutes. Si le problème persiste, contacte-nous.",
  },
];

export default function AssistancePage() {
  return (
    <div className="min-h-screen p-6 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Logo size="md" className="justify-center" />
        <h1 className="text-center text-2xl font-bold text-sky-400">
          Assistance
        </h1>
        <p className="text-center text-sm text-neutral-400">
          Une question sur La Nuit Hockey ? Tu trouveras peut-être ta réponse
          ci-dessous, sinon écris-nous directement.
        </p>

        <div className="space-y-4">
          {FAQ.map((item) => (
            <section
              key={item.question}
              className="rounded-lg border border-neutral-800 bg-neutral-900 p-4"
            >
              <h2 className="mb-1 text-sm font-semibold text-neutral-100">
                {item.question}
              </h2>
              <p className="text-sm leading-relaxed text-neutral-400">
                {item.answer}
              </p>
            </section>
          ))}
        </div>

        <section className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 text-center">
          <h2 className="mb-1 text-sm font-semibold text-neutral-100">
            Une autre question ?
          </h2>
          <p className="text-sm text-neutral-400">
            Écris-nous à{" "}
            <span className="font-medium text-neutral-100">
              contact@lanuithockey.app
            </span>{" "}
            et on te répond au plus vite.
          </p>
        </section>

        <div className="pt-4 text-center">
          <Link href="/login" className="text-sm text-sky-400 hover:underline">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
