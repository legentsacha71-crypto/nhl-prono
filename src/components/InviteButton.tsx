"use client";

import { useState } from "react";
import { Check, Share2 } from "lucide-react";
import { hapticTap, nativeShare } from "@/lib/native";

// Inviter des amis dans une ligue : menu de partage du téléphone (WhatsApp,
// SMS…) — natif dans l'appli, web sinon — ou à défaut copie du message.
// Le lien /rejoindre/<code> fait rejoindre la ligue en un geste.
export default function InviteButton({ name, code }: { name: string; code: string }) {
  const [copied, setCopied] = useState(false);

  async function invite() {
    // Lien magique : il ouvre l'appli (ou le site) et fait rejoindre la ligue.
    const url = `${window.location.origin}/rejoindre/${code}`;
    const text = `Rejoins ma ligue « ${name} » sur La Nuit Hockey 🏒\nCode : ${code}`;
    void hapticTap();
    if (await nativeShare({ title: "La Nuit Hockey", text, url })) return;
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
