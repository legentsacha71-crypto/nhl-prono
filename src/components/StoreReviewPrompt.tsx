"use client";

import { useEffect } from "react";
import { hapticSuccess, hasNativePlugin, requestStoreReview } from "@/lib/native";

// Demande de note sur l'App Store / le Play Store, à un moment où le joueur
// est content : juste après avoir vu un nouveau score exact (`celebrate`,
// avec une vibration de victoire), ou quand il joue depuis un moment.
// Au plus une demande tous les 60 jours de notre côté ; Apple et Google
// décident en plus eux-mêmes d'afficher ou non leur fenêtre.

const KEY = "lnh-review-asked";
const MIN_INTERVAL_MS = 60 * 24 * 60 * 60 * 1000;

function askedRecently(): boolean {
  try {
    const last = Number(localStorage.getItem(KEY) ?? 0);
    return Date.now() - last < MIN_INTERVAL_MS;
  } catch {
    return true;
  }
}

export default function StoreReviewPrompt({ celebrate = false }: { celebrate?: boolean }) {
  useEffect(() => {
    if (celebrate) void hapticSuccess();
    if (!hasNativePlugin("InAppReview") || askedRecently()) return;
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(KEY, String(Date.now()));
      } catch {
        return;
      }
      void requestStoreReview();
    }, 2000);
    return () => clearTimeout(timer);
  }, [celebrate]);

  return null;
}
