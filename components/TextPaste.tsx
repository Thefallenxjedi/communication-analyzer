"use client";

import { useState } from "react";

type TextPasteProps = {
  onSubmit: (transcript: string) => void;
  disabled?: boolean;
};

const MAX_CHARS = 12_000;

export function TextPaste({ onSubmit, disabled = false }: TextPasteProps) {
  const [text, setText] = useState("");

  const trimmed = text.trim();
  const tooLong = text.length > MAX_CHARS;

  return (
    <div className="border border-border bg-card/30 p-6 sm:p-8">
      <h3 className="font-serif text-2xl text-foreground">Paste text</h3>
      <p className="mt-2 text-sm text-muted">
        Drop in a speech script, interview answer, or any spoken-style text to
        analyze — no audio needed.
      </p>

      <textarea
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste your transcript or speaking script here…"
        rows={8}
        className="mt-6 w-full resize-y border border-border bg-background/80 px-4 py-3 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted/60 focus:border-accent disabled:opacity-50"
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p
          className={`text-xs tabular-nums ${
            tooLong ? "text-red-300" : "text-muted"
          }`}
        >
          {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
        </p>
        <button
          type="button"
          disabled={disabled || !trimmed || tooLong}
          onClick={() => onSubmit(trimmed)}
          className="rounded-full bg-accent px-6 py-3 text-sm font-semibold tracking-wide text-accent-dark transition hover:brightness-110 disabled:opacity-50"
        >
          Analyze text
        </button>
      </div>
    </div>
  );
}
