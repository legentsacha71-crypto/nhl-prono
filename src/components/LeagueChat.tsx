"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { ArrowUp, Target } from "lucide-react";
import RankAvatar from "@/components/RankAvatar";
import { sendMessage } from "@/app/leagues/[id]/chat/actions";
import { markSeen } from "@/lib/chatSeen";
import { getTextEntryFocus, subscribeTextEntryFocus } from "@/lib/textEntryFocus";
import { MESSAGE_MAX_LENGTH, type ChatMessage } from "@/lib/leagueChat";

// Chat d'une ligue façon messagerie : bulles groupées par auteur, séparateurs
// de jour, nouveaux messages récupérés toutes les quelques secondes tant que
// le chat est ouvert, et barre de saisie collée en bas de l'écran.

const POLL_MS = 4000;
// Deux messages du même joueur à moins de 5 min forment un seul bloc.
const GROUP_MS = 5 * 60 * 1000;
const PENDING_PREFIX = "pending-";

const TIME = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Paris" });
const DAY_KEY = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Paris" });
const DAY_LABEL = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});

function dayLabel(iso: string, now: Date): string {
  const key = DAY_KEY.format(new Date(iso));
  if (key === DAY_KEY.format(now)) return "Aujourd'hui";
  if (key === DAY_KEY.format(new Date(now.getTime() - 86400000))) return "Hier";
  const label = DAY_LABEL.format(new Date(iso));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function merge(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  const all = [...byId.values()];
  const sent = all.filter((m) => !m.id.startsWith(PENDING_PREFIX));
  const pending = all.filter((m) => m.id.startsWith(PENDING_PREFIX));
  sent.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  return [...sent, ...pending];
}

function sameGroup(a: ChatMessage | undefined, b: ChatMessage | undefined): boolean {
  if (!a || !b || a.exact || b.exact || a.userId !== b.userId) return false;
  if (DAY_KEY.format(new Date(a.createdAt)) !== DAY_KEY.format(new Date(b.createdAt))) return false;
  return Math.abs(Date.parse(b.createdAt) - Date.parse(a.createdAt)) < GROUP_MS;
}

function nearBottom(): boolean {
  return window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 200;
}

function scrollToBottom(smooth: boolean) {
  window.scrollTo({ top: document.documentElement.scrollHeight, behavior: smooth ? "smooth" : "auto" });
}

function ExactEvent({ message }: { message: ChatMessage }) {
  const e = message.exact!;
  return (
    <div className="flex justify-center py-1">
      <p className="flex max-w-[92%] items-center gap-1.5 rounded-full border border-amber-700/50 bg-amber-500/10 px-3 py-1.5 text-center text-[12px] leading-snug text-amber-200">
        <Target className="h-3.5 w-3.5 shrink-0 text-amber-400" aria-hidden="true" />
        <span>
          <span className="font-semibold">{message.username}</span> a trouvé le score exact {e.homeAbbrev}{" "}
          {e.homeScore}-{e.awayScore} {e.awayAbbrev} · <span className="font-semibold text-amber-300">+{e.points} pts</span>
        </span>
      </p>
    </div>
  );
}

export default function LeagueChat({
  leagueId,
  currentUserId,
  initialMessages,
  active,
}: {
  leagueId: string;
  currentUserId: string;
  initialMessages: ChatMessage[];
  active: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [now] = useState(() => new Date());
  const typing = useSyncExternalStore(subscribeTextEntryFocus, getTextEntryFocus, () => false);
  const stickRef = useRef(true);
  const inputRef = useRef<HTMLInputElement>(null);

  const lastSentAt = [...messages].reverse().find((m) => !m.id.startsWith(PENDING_PREFIX))?.createdAt;
  const lastRef = useRef(lastSentAt);
  useEffect(() => {
    lastRef.current = lastSentAt;
  }, [lastSentAt]);

  // Rafraîchissement tant que le chat est affiché et l'appli au premier plan.
  useEffect(() => {
    if (!active) return;
    let stopped = false;
    async function poll() {
      if (document.visibilityState !== "visible") return;
      const after = lastRef.current ? `?after=${encodeURIComponent(lastRef.current)}` : "";
      const res = await fetch(`/api/leagues/${leagueId}/messages${after}`, { cache: "no-store" });
      if (!res.ok) return;
      const { messages: fresh } = (await res.json()) as { messages: ChatMessage[] };
      if (stopped || fresh.length === 0) return;
      stickRef.current = nearBottom();
      setMessages((current) => merge(current, fresh));
    }
    const tick = () => void poll().catch(() => {});
    const timer = setInterval(tick, POLL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [active, leagueId]);

  // À l'ouverture du chat : on descend tout en bas.
  useEffect(() => {
    if (!active) return;
    stickRef.current = true;
    scrollToBottom(false);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    if (stickRef.current) scrollToBottom(true);
    if (lastSentAt) markSeen(leagueId, lastSentAt);
  }, [active, messages, lastSentAt, leagueId]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const body = text.trim();
    if (!body) return;
    const pendingId = `${PENDING_PREFIX}${Date.now()}`;
    const pending: ChatMessage = {
      id: pendingId,
      userId: currentUserId,
      username: "",
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      body,
      exact: null,
    };
    setText("");
    setError(null);
    stickRef.current = true;
    setMessages((current) => merge(current, [pending]));
    try {
      const sent = await sendMessage(leagueId, body);
      setMessages((current) => merge(current.filter((m) => m.id !== pendingId), [sent]));
    } catch {
      setMessages((current) => current.filter((m) => m.id !== pendingId));
      setText(body);
      setError("Message non envoyé. Vérifie ta connexion et réessaie.");
    }
    inputRef.current?.focus();
  }

  return (
    <div className="pb-20">
      {messages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-neutral-800 p-6 text-center">
          <p className="text-sm font-semibold text-neutral-200">Lance la discussion 👋</p>
          <p className="mt-1 text-sm text-neutral-500">
            Les scores exacts trouvés par la ligue s&apos;afficheront aussi ici.
          </p>
        </div>
      ) : (
        <ol className="space-y-0.5">
          {messages.map((m, i) => {
            const prev = messages[i - 1];
            const next = messages[i + 1];
            const newDay =
              !prev || DAY_KEY.format(new Date(prev.createdAt)) !== DAY_KEY.format(new Date(m.createdAt));
            const first = !sameGroup(prev, m);
            const last = !sameGroup(m, next);
            const mine = m.userId === currentUserId;
            const pendingMessage = m.id.startsWith(PENDING_PREFIX);

            return (
              <li key={m.id} className={first && !newDay ? "pt-2" : ""}>
                {newDay && (
                  <p className="py-3 text-center text-[11px] font-medium text-neutral-500">
                    {dayLabel(m.createdAt, now)}
                  </p>
                )}
                {m.exact ? (
                  <ExactEvent message={m} />
                ) : mine ? (
                  <div className="flex flex-col items-end">
                    <p
                      className={`max-w-[78%] whitespace-pre-wrap break-words rounded-2xl bg-sky-600 px-3 py-2 text-[15px] leading-snug text-white ${
                        last ? "rounded-br-md" : ""
                      } ${pendingMessage ? "opacity-60" : ""}`}
                    >
                      {m.body}
                    </p>
                    {last && (
                      <span className="mt-0.5 pr-1 text-[10px] text-neutral-600">
                        {pendingMessage ? "Envoi…" : TIME.format(new Date(m.createdAt))}
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <span className="w-7 shrink-0">
                      {last && <RankAvatar avatarUrl={m.avatarUrl} username={m.username} size={28} />}
                    </span>
                    <div className="flex min-w-0 max-w-[78%] flex-col items-start">
                      {first && <span className="mb-0.5 ml-1 text-[11px] text-neutral-500">{m.username}</span>}
                      <p
                        className={`whitespace-pre-wrap break-words rounded-2xl bg-neutral-800 px-3 py-2 text-[15px] leading-snug text-neutral-100 ${
                          last ? "rounded-bl-md" : ""
                        }`}
                      >
                        {m.body}
                      </p>
                      {last && (
                        <span className="mt-0.5 pl-1 text-[10px] text-neutral-600">
                          {TIME.format(new Date(m.createdAt))}
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {active && (
        <form
          onSubmit={onSubmit}
          className="fixed inset-x-0 z-40 px-4 transition-[bottom] duration-200"
          // Au-dessus de la barre d'onglets (et de son cercle qui dépasse) ;
          // tout en bas quand le clavier est ouvert, la barre s'efface alors.
          style={{ bottom: typing ? "0.5rem" : "calc(env(safe-area-inset-bottom) + 6rem)" }}
        >
          {error && (
            <p className="mx-auto mb-2 max-w-md rounded-lg bg-red-950/90 px-3 py-1.5 text-center text-xs text-red-300">
              {error}
            </p>
          )}
          <div className="mx-auto flex max-w-md items-center gap-2 rounded-full border border-neutral-700 bg-neutral-900/95 py-1.5 pl-4 pr-1.5 shadow-lg shadow-black/50 backdrop-blur transition-colors focus-within:border-sky-500/70">
            <input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MESSAGE_MAX_LENGTH}
              enterKeyHint="send"
              placeholder="Message…"
              aria-label="Écrire un message"
              className="min-w-0 flex-1 bg-transparent text-base text-neutral-100 placeholder:text-neutral-500"
              // Le contour de focus global (globals.css) est remplacé par la
              // bordure de la bulle de saisie.
              style={{ outline: "none" }}
            />
            <button
              type="submit"
              disabled={!text.trim()}
              aria-label="Envoyer"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500 text-neutral-950 transition-transform active:scale-95 disabled:bg-neutral-800 disabled:text-neutral-500"
            >
              <ArrowUp size={18} strokeWidth={2.5} aria-hidden="true" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
