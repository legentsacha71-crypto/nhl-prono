// Comptes Instagram / TikTok liés à l'appli, affichés sur la page d'accueil.
// Lucide n'a plus d'icônes de marques : glyphes dessinés ici en SVG.

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
    </svg>
  );
}

const INSTAGRAM_ICON_CLASS =
  "bg-[linear-gradient(45deg,#f58529_0%,#dd2a7b_50%,#8134af_100%)] text-white";

const ACCOUNTS = [
  {
    network: "Instagram",
    account: "La Nuit Hockey",
    handle: "@lanuithockey",
    href: "https://www.instagram.com/lanuithockey/",
    icon: <InstagramIcon />,
    iconClass: INSTAGRAM_ICON_CLASS,
  },
  {
    network: "Instagram",
    account: "La Nuit NHL",
    handle: "@lanuitnhl",
    href: "https://www.instagram.com/lanuitnhl/",
    icon: <InstagramIcon />,
    iconClass: INSTAGRAM_ICON_CLASS,
  },
  {
    network: "TikTok",
    account: "La Nuit NHL",
    handle: "@la.nuit.nhl",
    href: "https://www.tiktok.com/@la.nuit.nhl",
    icon: <TikTokIcon />,
    iconClass: "bg-black text-white ring-1 ring-neutral-700",
  },
];

export default function SocialLinks() {
  return (
    <section className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-md shadow-black/20">
      <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">
        Suis-nous
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {ACCOUNTS.map((a) => (
          <a
            key={a.href}
            href={a.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${a.account} sur ${a.network} (${a.handle})`}
            className="flex min-w-0 flex-col items-center gap-1.5 rounded-xl border border-neutral-800 bg-neutral-950 px-1.5 py-3 text-center transition-all duration-150 hover:border-neutral-700 active:scale-[0.97]"
          >
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${a.iconClass}`}>
              {a.icon}
            </span>
            <span className="flex min-h-[2.5em] w-full items-center justify-center text-xs font-medium leading-tight text-neutral-200">
              {a.account}
            </span>
            <span className="w-full truncate text-[11px] text-neutral-500">
              {a.handle}
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
