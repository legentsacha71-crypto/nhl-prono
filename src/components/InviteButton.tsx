"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";

// Inviter des amis dans une ligue : menu de partage du téléphone (WhatsApp,
// SMS…) quand il est disponible, sinon copie du message d'invitation.
export default function InviteButton({ name, code }: { name: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function invite() {
    const url = window.location.origin;
    const text = `Rejoins ma ligue « ${name} » sur La Nuit Hockey 🏒\nCode : ${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "La Nuit Hockey", text, url });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text}\n${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copie ce message pour inviter tes amis :", `${text}\n${url}`);
    }
  }

  return (
    <button
      type="button"
      onClick={invite}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-sky-500 px-3.5 py-1.5 text-sm font-semibold text-neutral-950 shadow-md shadow-sky-950/40 transition-transform active:scale-[0.97]"
    >
      {copied ? <Check size={16} aria-hidden="true" /> : <Share2 size={16} aria-hidden="true" />}
      {copied ? "Copié !" : "Inviter"}
    </button>
  );
}
