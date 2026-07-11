"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { addComment, type CommentState } from "./actions";

function Send() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="shrink-0 rounded-xl bg-gradient-to-br from-blu to-navy px-4 py-2.5 font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Invio…" : "Invia analisi"}
    </button>
  );
}

export function CommentForm({ videoId }: { videoId: string }) {
  const [state, action] = useActionState(addComment, {} as CommentState);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="video_id" value={videoId} />
      <div className="flex gap-2">
        <input
          name="body"
          placeholder="Analisi tecnica (es. virata più raccolta)…"
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-blu"
        />
        <Send />
      </div>
      {state.error && <p className="text-sm text-[#DC2626]">{state.error}</p>}
      {state.info && <p className="text-sm text-teal">{state.info}</p>}
    </form>
  );
}
