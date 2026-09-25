"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { RulesList } from "@/components/RulesCard";
import DeleteAccountForm from "@/components/DeleteAccountForm";

type Section = "rules" | "username" | "delete";

type HomeMenuProps = {
  username: string;
  updateUsername: (formData: FormData) => Promise<{ error?: string }>;
  deleteAccount: () => Promise<void>;
};

const noopSubscribe = () => () => {};

function MenuSection({
  id,
  icon,
  title,
  open,
  onToggle,
  danger = false,
  children,
}: {
  id: string;
  icon: string;
  title: string;
  open: boolean;
  onToggle: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="border-b border-neutral-800">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        className={`flex w-full items-center gap-3 px-5 py-4 text-left text-sm font-medium transition-colors duration-150 active:bg-neutral-800/60 ${
          danger ? "text-red-400" : "text-neutral-100"
        }`}
      >
        <span className="text-lg leading-none" aria-hidden="true">
          {icon}
        </span>
        <span className="flex-1">{title}</span>
        <span
          aria-hidden="true"
          className={`text-neutral-500 transition-transform duration-200 ${
            open ? "rotate-90" : ""
          }`}
        >
          ›
        </span>
      </button>
      {open && (
        <div id={id} className="px-5 pb-5">
          {children}
        </div>
      )}
    </div>
  );
}

function UsernameForm({
  username,
  updateUsername,
}: Pick<HomeMenuProps, "username" | "updateUsername">) {
  const [value, setValue] = useState(username);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(
    null,
  );
  const [isPending, startTransition] = useTransition();
  const trimmed = value.trim();
  const unchanged = trimmed === username;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.set("username", trimmed);
        startTransition(async () => {
          try {
            const { error } = await updateUsername(formData);
            setMessage(
              error
                ? { ok: false, text: error }
                : { ok: true, text: "✓ Pseudo mis à jour" },
            );
          } catch {
            setMessage({ ok: false, text: "Erreur réseau, réessaie." });
          }
        });
      }}
      className="space-y-2"
    >
      <label htmlFor="menu-username" className="block text-xs text-neutral-400">
        Nouveau pseudo (3 à 20 caractères)
      </label>
      <div className="flex items-center gap-2">
        <input
          id="menu-username"
          type="text"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setMessage(null);
          }}
          minLength={3}
          maxLength={20}
          autoComplete="off"
          autoCapitalize="off"
          className="min-w-0 flex-1 rounded-md border border-neutral-700 bg-neutral-950 p-2 text-sm text-neutral-100 transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500/50"
        />
        <button
          type="submit"
          disabled={isPending || unchanged || trimmed.length < 3}
          className="shrink-0 rounded-md bg-sky-600 px-3 py-2 text-sm font-medium text-white transition-all duration-150 hover:bg-sky-500 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isPending ? "…" : "Enregistrer"}
        </button>
      </div>
      {message && (
        <p
          role="status"
          className={`text-xs ${message.ok ? "text-emerald-400" : "text-red-400"}`}
        >
          {message.text}
        </p>
      )}
    </form>
  );
}

// Bouton "trois traits" en haut à gauche de l'accueil, qui ouvre un panneau
// latéral : règles du jeu, changement de pseudo, suppression du compte.
// Le panneau est rendu dans <body> (portail) : la barre du haut a un
// backdrop-blur, qui piégerait sinon un élément `fixed` à l'intérieur de la
// barre au lieu de couvrir tout l'écran.
export default function HomeMenu({
  username,
  updateUsername,
  deleteAccount,
}: HomeMenuProps) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section | null>(null);
  const isClient = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const baseId = useId();

  function close() {
    setOpen(false);
    setSection(null);
    triggerRef.current?.focus();
  }

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (next: Section) =>
    setSection((current) => (current === next ? null : next));

  const panel = (
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
        aria-label="Menu"
        className={`absolute inset-y-0 left-0 flex w-[85%] max-w-xs flex-col border-r border-neutral-800 bg-neutral-900 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] shadow-2xl shadow-black/50 transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs text-neutral-500">Connecté en tant que</p>
            <p className="truncate text-sm font-semibold text-sky-400">
              {username}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Fermer le menu"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl text-neutral-400 transition-colors hover:bg-neutral-800 hover:text-neutral-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <MenuSection
            id={`${baseId}-rules`}
            icon="📖"
            title="Règles du jeu"
            open={section === "rules"}
            onToggle={() => toggle("rules")}
          >
            <RulesList />
          </MenuSection>

          <MenuSection
            id={`${baseId}-username`}
            icon="✏️"
            title="Changer mon pseudo"
            open={section === "username"}
            onToggle={() => toggle("username")}
          >
            <UsernameForm username={username} updateUsername={updateUsername} />
          </MenuSection>

          <MenuSection
            id={`${baseId}-delete`}
            icon="🗑️"
            title="Supprimer mon compte"
            open={section === "delete"}
            onToggle={() => toggle("delete")}
            danger
          >
            <DeleteAccountForm
              deleteAccount={deleteAccount}
              startExpanded
              onCancel={() => setSection(null)}
            />
          </MenuSection>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        aria-haspopup="dialog"
        className="-ml-1.5 flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-md transition-colors hover:bg-neutral-800 active:scale-95"
      >
        <span className="h-0.5 w-5 rounded-full bg-neutral-300" />
        <span className="h-0.5 w-5 rounded-full bg-neutral-300" />
        <span className="h-0.5 w-5 rounded-full bg-neutral-300" />
      </button>
      {isClient && createPortal(panel, document.body)}
    </>
  );
}
