// Vrai tant qu'un champ de saisie a le focus, donc que le clavier du
// téléphone est ouvert. Sert à masquer la barre d'onglets du bas : dans
// l'appli iOS, la WebView se redimensionne au-dessus du clavier et la barre
// (position fixed) remontait en plein milieu de l'écran pendant la saisie
// d'un score.
const NON_TEXT_INPUTS = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

function isTextEntry(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  if (el instanceof HTMLInputElement) {
    return !el.readOnly && !NON_TEXT_INPUTS.has(el.type);
  }
  return el instanceof HTMLElement && el.isContentEditable;
}

let focused = false;
const listeners = new Set<() => void>();

function update() {
  const next = isTextEntry(document.activeElement);
  if (next === focused) return;
  focused = next;
  listeners.forEach((listener) => listener());
}

// focusout puis focusin quand on passe d'une case de score à l'autre : on
// relit l'élément actif au tour suivant pour ne pas faire clignoter la barre.
function onFocusChange() {
  setTimeout(update, 0);
}

export function subscribeTextEntryFocus(listener: () => void) {
  if (listeners.size === 0) {
    document.addEventListener("focusin", onFocusChange);
    document.addEventListener("focusout", onFocusChange);
  }
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      document.removeEventListener("focusin", onFocusChange);
      document.removeEventListener("focusout", onFocusChange);
    }
  };
}

export function getTextEntryFocus() {
  return focused;
}
