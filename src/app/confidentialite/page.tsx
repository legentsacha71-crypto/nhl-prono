import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata = {
  title: "Politique de confidentialité — La Nuit Hockey",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen p-6 py-12">
      <div className="mx-auto w-full max-w-2xl space-y-6">
        <Logo size="md" className="justify-center" />
        <h1 className="text-center text-2xl font-bold text-sky-400">
          Politique de confidentialité
        </h1>
        <p className="text-center text-xs text-neutral-500">
          Dernière mise à jour : juillet 2026
        </p>

        <div className="space-y-6 text-sm leading-relaxed text-neutral-300">
          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-100">
              1. Qui sommes-nous ?
            </h2>
            <p>
              La Nuit Hockey est une application de pronostics de scores de
              hockey NHL entre amis, développée et éditée à titre personnel.
              Pour toute question relative à cette politique ou à vos
              données, contactez-nous à l&apos;adresse :{" "}
              <span className="font-medium text-neutral-100">
                contact@lanuithockey.app
              </span>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-100">
              2. Données que nous collectons
            </h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <span className="text-neutral-100">Compte</span> : adresse
                email et mot de passe (le mot de passe n&apos;est jamais
                stocké en clair, il est géré par notre prestataire
                d&apos;authentification).
              </li>
              <li>
                <span className="text-neutral-100">Profil</span> : pseudo et,
                si vous choisissez d&apos;en ajouter une, photo de profil.
              </li>
              <li>
                <span className="text-neutral-100">Pronostics</span> : les
                scores que vous pronostiquez pour chaque match et les points
                obtenus une fois les matchs terminés.
              </li>
              <li>
                <span className="text-neutral-100">Ligues</span> : les
                groupes privés (ligues entre amis) que vous créez ou
                rejoignez via un code d&apos;invitation, et les messages que
                vous y envoyez.
              </li>
            </ul>
            <p className="mt-2">
              Nous ne collectons aucune donnée de paiement : l&apos;app ne
              propose aujourd&apos;hui aucun achat ni abonnement payant.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-100">
              3. Pourquoi nous collectons ces données
            </h2>
            <p>
              Ces informations servent uniquement au fonctionnement de
              l&apos;app : vous authentifier, afficher votre profil et vos
              pronostics aux autres membres de vos ligues, calculer et
              afficher les classements. Nous ne vendons ni ne partageons
              vos données avec des régies publicitaires ou des tiers à des
              fins commerciales.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-100">
              4. Hébergement et sous-traitants
            </h2>
            <p>
              Vos données sont hébergées par{" "}
              <span className="text-neutral-100">Supabase</span> (base de
              données et authentification) et l&apos;application est servie
              par <span className="text-neutral-100">Vercel</span>. Ces
              prestataires agissent en tant que sous-traitants techniques et
              n&apos;utilisent pas vos données à leurs propres fins.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-100">
              5. Vos droits
            </h2>
            <p>
              Conformément au RGPD, vous pouvez à tout moment demander
              l&apos;accès, la correction ou la suppression de vos données en
              nous contactant à{" "}
              <span className="font-medium text-neutral-100">
                contact@lanuithockey.app
              </span>
              . Vous pouvez également supprimer votre compte directement
              depuis la page{" "}
              <span className="text-neutral-100">Profil</span> de l&apos;app.
            </p>
          </section>

          <section>
            <h2 className="mb-2 text-base font-semibold text-neutral-100">
              6. Conservation des données
            </h2>
            <p>
              Vos données sont conservées tant que votre compte est actif.
              Elles sont supprimées dans un délai raisonnable après la
              suppression de votre compte.
            </p>
          </section>
        </div>

        <div className="pt-4 text-center">
          <Link href="/login" className="text-sm text-sky-400 hover:underline">
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
