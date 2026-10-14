"use client";

import { useState } from "react";
import { Plus, Ticket } from "lucide-react";
import SubmitButton from "@/components/SubmitButton";
import { createLeague, joinLeague } from "@/app/leagues/actions";

// "Créer" et "Rejoindre" : deux boutons, le formulaire choisi s'ouvre en
// dessous (au lieu de deux formulaires toujours affichés).
export default function LeagueForms({ defaultOpen = null }: { defaultOpen?: "create" | "join" | null }) {
  const [open, setOpen] = useState<"create" | "join" | null>(defaultOpen);

  const button = (key: "create" | "join") =>
    `flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-3 text-sm font-semibold transition-colors active:scale-[0.98] ${
      open === key
        ? "border-sky-500/60 bg-sky-500/15 text-sky-200"
        : "border-neutral-800 bg-neutral-900 text-neutral-200 hover:border-neutral-700"
    }`;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        <button type="button" className={button("create")} onClick={() => setOpen(open === "create" ? null : "create")}>
          <Plus size={16} aria-hidden="true" />
          Créer une ligue
        </button>
        <button type="button" className={button("join")} onClick={() => setOpen(open === "join" ? null : "join")}>
          <Ticket size={16} aria-hidden="true" />
          Rejoindre
        </button>
      </div>

      {open === "create" && (
        <form action={createLeague} className="flex gap-2">
          <input
            name="name"
            type="text"
            placeholder="Nom de ta ligue"
            required
            autoFocus
            className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-base text-neutral-100 placeholder:text-neutral-500 focus:border-sky-500 focus:outline-none"
          />
          <SubmitButton className="shrink-0 rounded-xl bg-sky-500 px-4 text-sm font-semibold text-neutral-950 transition-transform active:scale-[0.97]">
            Créer
          </SubmitButton>
        </form>
      )}

      {open === "join" && (
        <form action={joinLeague} className="flex gap-2">
          <input
            name="code"
            type="text"
            placeholder="Code à 6 caractères"
            required
            maxLength={6}
            autoFocus
            autoCapitalize="characters"
            className="min-w-0 flex-1 rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-2.5 font-mono text-base uppercase tracking-widest text-neutral-100 placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-500 focus:border-sky-500 focus:outline-none"
          />
          <SubmitButton className="shrink-0 rounded-xl bg-sky-500 px-4 text-sm font-semibold text-neutral-950 transition-transform active:scale-[0.97]">
            Rejoindre
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
