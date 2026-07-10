// Emplacement publicitaire affiché dans la barre du haut (TopBar), masqué pour
// les membres Premium (profiles.is_premium — vérifié côté TopBar). Pour
// l'instant c'est un simple placeholder visuel : pas de compte publicitaire
// créé (AdSense ou autre). Le jour où un compte existe, il suffira de
// remplacer le contenu ci-dessous par le vrai script/iframe fourni par la
// régie, sans toucher au reste de la logique.
export default function AdBanner() {
  return (
    <div className="border-t border-neutral-800 bg-neutral-900/80 px-4 py-1.5 text-center text-[10px] text-neutral-500">
      Espace publicitaire — passe en{" "}
      <span className="font-medium text-amber-400">Premium</span> pour ne
      plus voir cette bannière.
    </div>
  );
}
