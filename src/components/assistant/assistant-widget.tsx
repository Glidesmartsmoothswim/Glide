"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, Send, X } from "lucide-react";

const FAB = 48; // lato del bottone flottante (px)
const POS_KEY = "glide-assist-pos";

type Msg = { from: "me" | "glide"; text: string; safety?: string | null };

const WELCOME =
  "Posso spiegarti il perché di un allenamento, come funziona GLIDE, o aiutarti a orientarti. L'allenamento lo scrive Alessio. Sempre.";

/**
 * Assistente del nuotatore — bottone flottante + pannello.
 * Solo testo ↔ testo (ADR-001). La cronologia vive in memoria di pagina:
 * niente persistenza dei messaggi (il contenuto salute non deve vivere da
 * nessuna parte, ADR-004).
 */
export function AssistantWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ from: "glide", text: WELCOME }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // Bottone flottante TRASCINABILE: non resta mai incollato a un CTA. Si aggancia
  // al bordo più vicino quando lo lasci e ricorda dove l'hai messo.
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{
    sx: number;
    sy: number;
    ox: number;
    oy: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(POS_KEY);
      if (saved) {
        setPos(JSON.parse(saved));
        return;
      }
    } catch {}
    // Default: in basso a destra, sopra la tabbar.
    setPos({
      x: window.innerWidth - FAB - 16,
      y: window.innerHeight - FAB - 96,
    });
  }, []);

  const clampPos = (x: number, y: number) => ({
    x: Math.max(8, Math.min(window.innerWidth - FAB - 8, x)),
    y: Math.max(8, Math.min(window.innerHeight - FAB - 8, y)),
  });

  const onDragStart = (e: React.PointerEvent) => {
    if (!pos) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = {
      sx: e.clientX,
      sy: e.clientY,
      ox: e.clientX - pos.x,
      oy: e.clientY - pos.y,
      moved: false,
    };
  };
  const onDragMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.sx) > 5 || Math.abs(e.clientY - d.sy) > 5)
      d.moved = true;
    setPos(clampPos(e.clientX - d.ox, e.clientY - d.oy));
  };
  const onDragEnd = () => {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    if (!d.moved) {
      // Tap senza trascinamento = apri l'assistente.
      setOpen(true);
      return;
    }
    // Aggancio al bordo verticale più vicino.
    setPos((p) => {
      if (!p) return p;
      const toLeft = p.x + FAB / 2 < window.innerWidth / 2;
      const snapped = clampPos(toLeft ? 16 : window.innerWidth - FAB - 16, p.y);
      try {
        localStorage.setItem(POS_KEY, JSON.stringify(snapped));
      } catch {}
      return snapped;
    });
  };

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMsgs((m) => [...m, { from: "me", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = (await res.json()) as { text?: string; safety?: string | null };
      setMsgs((m) => [
        ...m,
        {
          from: "glide",
          text: data.text ?? "Non ho capito, riprova.",
          safety: data.safety ?? null,
        },
      ]);
    } catch {
      setMsgs((m) => [
        ...m,
        { from: "glide", text: "Connessione assente. Riprova tra poco." },
      ]);
    } finally {
      setBusy(false);
      setTimeout(
        () => listRef.current?.scrollTo({ top: 99999, behavior: "smooth" }),
        50,
      );
    }
  };

  if (!open) {
    return (
      <button
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        aria-label="Apri l'assistente — trascinalo per spostarlo"
        style={
          pos
            ? { left: pos.x, top: pos.y, touchAction: "none" }
            : { touchAction: "none" }
        }
        className={`fixed z-40 grid h-12 w-12 cursor-grab touch-none place-items-center rounded-full bg-gradient-to-br from-blu to-navy text-white shadow-lg active:cursor-grabbing ${
          pos ? "" : "bottom-24 right-4"
        }`}
      >
        <MessageCircleQuestion size={22} />
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 mx-auto flex h-[70dvh] max-w-md flex-col rounded-t-2xl border border-border bg-surface shadow-2xl">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="font-semibold">Assistente GLIDE</p>
          <p className="t-small text-muted">
            Spiega, non prescrive. Il carico resta di Alessio.
          </p>
        </div>
        <button
          onClick={() => setOpen(false)}
          aria-label="Chiudi"
          className="grid h-8 w-8 place-items-center rounded-lg text-muted hover:bg-background"
        >
          <X size={18} />
        </button>
      </header>

      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3">
        <div className="flex flex-col gap-2">
          {msgs.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm ${
                m.from === "me"
                  ? "self-end bg-blu text-white"
                  : m.safety
                    ? "self-start border border-amber-500/40 bg-amber-500/10"
                    : "self-start bg-background"
              }`}
            >
              {m.text}
            </div>
          ))}
          {busy && (
            <div className="self-start rounded-2xl bg-background px-3.5 py-2 text-sm text-muted">
              …
            </div>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        className="flex items-center gap-2 border-t border-border p-3 pb-[max(env(safe-area-inset-bottom),12px)]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrivi qui…"
          maxLength={2000}
          className="flex-1 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm outline-none focus:border-blu"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Invia"
          className="grid h-10 w-10 place-items-center rounded-xl bg-blu text-white disabled:opacity-40"
        >
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
