"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, Clock, MessageCircle, Target } from "lucide-react";

// Fenêtre affichée à l'ouverture de l'appli pour proposer les notifications,
// avant la demande officielle d'iOS / Android (qui ne s'affiche qu'une fois :
// on explique d'abord à quoi elles servent). Le joueur doit choisir : pas de
// fermeture en touchant le fond.
//
// - "soft" : jamais demandé → « Oui, activer » lance la demande du téléphone.
// - "settings" : déjà refusé dans le téléphone → on explique où les rallumer
//   (sur iPhone, le bouton ouvre directement les Réglages de l'appli).

export type PushAsk = "soft" | "settings";

const PERKS = [
  { icon: Clock, text: "Un rappel avant tes matchs, pour ne jamais oublier un prono" },
  { icon: Target, text: "Une alerte quand tu trouves le score exact" },
  { icon: MessageCircle, text: "Les nouveaux messages de tes ligues" },
];

export default function PushPermissionSheet({
  ask,
  platform,
  onAccept,
  onDecline,
}: {
  ask: PushAsk;
  platform: "ios" | "android";
  onAccept: () => void;
  onDecline: () => void;
}) {
  const [shown, setShown] = useState(false);

  // Entrée en glissant depuis le bas, et pas de défilement de la page dessous.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setShown(true));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const off = ask === "settings";
  const canOpenSettings = platform === "ios";
  const settingsPath =
    platform === "ios"
      ? "Réglages › La Nuit Hockey › Notifications"
      : "Paramètres › Applications › La Nuit Hockey › Notifications";

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center">
      <div
        className={`absolute inset-0 bg-black/70 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-sheet-title"
        className={`relative w-full max-w-md rounded-t-3xl border-t border-neutral-800 bg-neutral-900 px-6 pt-7 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] shadow-2xl shadow-black/60 transition-transform duration-300 ease-out ${
          shown ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div
          className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ring-1 ${
            off ? "bg-amber-500/10 ring-amber-500/40" : "bg-sky-500/15 ring-sky-500/40"
          }`}
        >
          {off ? (
            <BellOff className="h-8 w-8 text-amber-400" aria-hidden="true" />
          ) : (
            <BellRing className="h-8 w-8 text-sky-400" aria-hidden="true" />
          )}
        </div>

        <h2
          id="push-sheet-title"
          className="mt-4 text-center font-display text-3xl uppercase leading-none tracking-wide text-neutral-50"
        >
          {off ? "Tes notifications sont coupées" : "Active les notifications"}
        </h2>
        <p className="mt-2 text-center text-sm text-neutral-400">
          {off ? "Tu rates les rappels et les alertes de la soirée :" : "Pour ne rien rater de la soirée :"}
        </p>

        <ul className="mt-5 space-y-3">
          {PERKS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-center gap-3 rounded-xl bg-neutral-800/60 px-3.5 py-3">
              <Icon className="h-5 w-5 shrink-0 text-sky-400" aria-hidden="true" />
              <span className="text-sm leading-snug text-neutral-200">{text}</span>
            </li>
          ))}
        </ul>

        {off && (
          <p className="mt-4 text-center text-xs leading-relaxed text-neutral-400">
            Pour les rallumer : <span className="font-semibold text-neutral-200">{settingsPath}</span>
          </p>
        )}

        <div className="mt-6 space-y-2">
          {(!off || canOpenSettings) && (
            <button
              type="button"
              onClick={onAccept}
              className="w-full rounded-xl bg-sky-500 py-3.5 text-[15px] font-semibold text-neutral-950 transition-transform active:scale-[0.98]"
            >
              {off ? "Ouvrir les Réglages" : "Oui, activer les notifications"}
            </button>
          )}
          <button
            type="button"
            onClick={onDecline}
            className={`w-full rounded-xl py-3 text-sm font-semibold transition-transform active:scale-[0.98] ${
              off && !canOpenSettings
                ? "bg-neutral-800 text-neutral-100"
                : "text-neutral-400"
            }`}
          >
            {off && !canOpenSettings ? "Compris" : "Non merci"}
          </button>
        </div>

        {!off && (
          <p className="mt-2 text-center text-[11px] text-neutral-600">
            Tu pourras changer d&apos;avis à tout moment dans les réglages du téléphone.
          </p>
        )}
      </div>
    </div>
  );
}
