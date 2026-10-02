"use client";

import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronRight,
  Lock,
  Plus,
  Search,
  Target,
  Trophy,
  X,
} from "lucide-react";
import TeamBadge from "@/components/TeamBadge";

export type FavoriteOption = {
  id: string;
  label: string;
  points: number;
  probability?: number;
  teamAbbrev?: string;
};

type FavoritePickProps = {
  kind: "team" | "player";
  title: string;
  options: FavoriteOption[];
  pickId: string | null;
  // "open" : modifiable (submitPick requis) ; "locked" : choix figé, en
  // attente du résultat ; "resolved" : résultat connu (earned, winnerLabel).
  mode: "open" | "locked" | "resolved";
  submitPick?: (id: string) => Promise<void>;
  earned?: number;
  winnerLabel?: string;
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

const noopSubscribe = () => () => {};

function initials(label: string) {
  const parts = label.split(" ").filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

// Comparaison sans accents ni casse pour la recherche ("pastrnak" trouve
// "Pastrňák", "ROBERT" trouve "Robertson").
function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function OptionBadge({
  option,
  size,
}: {
  option: FavoriteOption;
  size: number;
}) {
  if (option.teamAbbrev) {
    return <TeamBadge abbrev={option.teamAbbrev} name={option.label} size={size} />;
  }
  return (
    <div
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-sky-800 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.34 }}
    >
      {initials(option.label)}
    </div>
  );
}

function formatProbability(probability?: number) {
  if (probability === undefined) return "Gros outsider";
  return `${probability.toLocaleString("fr-FR")} % de chances`;
}

// Un favori de fin de saison (vainqueur de la coupe Stanley, meilleur
// buteur) : carte du choix actuel, et panneau de sélection qui monte du bas
// de l'écran (rendu dans <body>, comme le menu de l'accueil, pour couvrir
// tout l'écran). Choisir = enregistrer, sans bouton de validation.
export default function FavoritePick({
  kind,
  title,
  options,
  pickId,
  mode,
  submitPick,
  earned,
  winnerLabel,
}: FavoritePickProps) {
  const [selectedId, setSelectedId] = useState(pickId);
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [, startTransition] = useTransition();
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find((o) => o.id === selectedId) ?? null;
  const maxProbability = Math.max(...options.map((o) => o.probability ?? 0), 1);
  const Icon = kind === "team" ? Trophy : Target;
  const noun = kind === "team" ? "une équipe" : "un joueur";

  function close() {
    setOpen(false);
    setQuery("");
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Fait défiler la liste jusqu'au choix actuel.
    listRef.current
      ?.querySelector('[aria-selected="true"]')
      ?.scrollIntoView({ block: "center" });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(id: string) {
    close();
    if (id === selectedId || !submitPick) return;
    const previous = selectedId;
    setSelectedId(id);
    setStatus("saving");
    startTransition(async () => {
      try {
        await submitPick(id);
        setStatus("saved");
      } catch {
        setSelectedId(previous);
        setStatus("error");
      }
    });
  }

  const filtered = deferredQuery
    ? options.filter((o) => normalize(o.label).includes(normalize(deferredQuery)))
    : options;

  const pointsBlock = (() => {
    if (!selected) return null;
    if (mode === "resolved") {
      const won = (earned ?? 0) > 0;
      return (
        <div className="text-right">
          <p
            className={`font-display text-2xl leading-none ${won ? "text-emerald-400" : "text-neutral-500"}`}
          >
            {won ? `+${earned}` : "0"}
          </p>
          <p className="mt-1 text-[10px] leading-tight text-neutral-500">
            {won ? "pts gagnés" : "pt"}
          </p>
        </div>
      );
    }
    return (
      <div className="text-right">
        <p className="font-display text-2xl leading-none text-sky-400">
          +{selected.points}
        </p>
        <p className="mt-1 text-[10px] leading-tight text-neutral-500">
          pts si
          <br />
          gagné
        </p>
      </div>
    );
  })();

  const pickRow = selected && (
    <div className="flex w-full items-center gap-2.5">
      <OptionBadge option={selected} size={40} />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 leading-tight font-semibold text-neutral-100">
          {selected.label}
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {mode === "resolved" && winnerLabel
            ? `Vainqueur : ${winnerLabel}`
            : formatProbability(selected.probability)}
        </p>
      </div>
      {pointsBlock}
    </div>
  );

  const statusLine =
    status === "saving" ? (
      <span className="text-neutral-500">Enregistrement…</span>
    ) : status === "saved" ? (
      <span className="text-emerald-400">✓ Enregistré</span>
    ) : status === "error" ? (
      <span className="text-red-400">
        Le choix n&apos;a pas pu être enregistré, réessaie.
      </span>
    ) : null;

  const sheet = (
    <div
      className={`fixed inset-0 z-[60] ${open ? "" : "pointer-events-none"}`}
      aria-hidden={!open}
      inert={!open}
    >
      <div
        onClick={close}
        className={`absolute inset-0 bg-black/60 transition-opacity duration-200 ${
          open ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`absolute inset-x-0 bottom-0 mx-auto flex max-h-[80dvh] max-w-md flex-col rounded-t-3xl border-t border-neutral-800 bg-neutral-900 pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-black/60 transition-transform duration-300 ease-out ${
          open ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-neutral-700" />
        <div className="flex items-center justify-between gap-3 px-5 pt-3 pb-2">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-neutral-100">
              {title}
            </p>
            <p className="text-xs text-neutral-500">
              Plus ton choix est outsider, plus il rapporte.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Fermer"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {kind === "player" && (
          <div className="px-5 pb-2">
            <label className="flex items-center gap-2 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2 focus-within:border-sky-500">
              <Search size={16} className="text-neutral-500" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Rechercher un joueur"
                autoComplete="off"
                className="w-full bg-transparent text-sm text-neutral-100 placeholder:text-neutral-600 focus:outline-none"
              />
            </label>
          </div>
        )}

        <ul
          ref={listRef}
          role="listbox"
          aria-label={title}
          className="flex-1 space-y-1.5 overflow-y-auto px-3 pt-1 pb-4"
        >
          {filtered.length === 0 && (
            <li className="p-6 text-center text-sm text-neutral-500">
              Aucun joueur ne correspond.
            </li>
          )}
          {filtered.map((option) => {
            const isSelected = option.id === selectedId;
            const share = (option.probability ?? 0) / maxProbability;
            return (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => choose(option.id)}
                  className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors active:scale-[0.99] ${
                    isSelected
                      ? "border-sky-500/70 bg-sky-500/10"
                      : "border-transparent hover:bg-neutral-800/60"
                  }`}
                >
                  <OptionBadge option={option} size={36} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-100">
                      {option.label}
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-1 w-16 overflow-hidden rounded-full bg-neutral-800">
                        <div
                          className="h-full rounded-full bg-sky-500/70"
                          style={{ width: `${Math.max(4, share * 100)}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-neutral-500">
                        {formatProbability(option.probability)}
                      </span>
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-neutral-800 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                    +{option.points}
                  </span>
                  {isSelected && (
                    <Check size={18} className="shrink-0 text-sky-400" aria-hidden="true" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="rounded-xl border border-neutral-800/80 bg-neutral-950/40 p-3">
      <p className="mb-2.5 flex items-center gap-2 text-sm font-medium text-neutral-300">
        <Icon size={16} className="text-amber-400" aria-hidden="true" />
        {title}
      </p>

      {mode === "open" ? (
        <>
          <button
            ref={triggerRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={open}
            className={`flex w-full items-center gap-2 rounded-xl p-2.5 text-left transition-all active:scale-[0.99] ${
              selected
                ? "bg-neutral-900 hover:bg-neutral-800/80"
                : "justify-center border border-dashed border-neutral-700 py-4 text-sm font-medium text-sky-400 hover:border-sky-600"
            }`}
          >
            {selected ? (
              <>
                {pickRow}
                <ChevronRight size={18} className="shrink-0 text-neutral-600" aria-hidden="true" />
              </>
            ) : (
              <>
                <Plus size={16} aria-hidden="true" />
                Choisir {noun}
              </>
            )}
          </button>
          {statusLine && <p className="mt-1.5 text-xs">{statusLine}</p>}
          {isClient && createPortal(sheet, document.body)}
        </>
      ) : selected ? (
        <div className="rounded-xl bg-neutral-900 p-2.5">
          {pickRow}
          {mode === "locked" && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-neutral-500">
              <Lock size={12} aria-hidden="true" />
              Choix verrouillé, en attente du résultat
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-xl bg-neutral-900 p-3 text-sm text-neutral-500">
          {mode === "resolved"
            ? `Pas de choix.${winnerLabel ? ` Vainqueur : ${winnerLabel}.` : ""}`
            : "Verrouillé : tu n'as pas fait de choix."}
        </p>
      )}
    </div>
  );
}
