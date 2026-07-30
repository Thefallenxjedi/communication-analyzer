"use client";

import { useState } from "react";
import { parseYouTubeUrl } from "@/lib/validate-media";

type YouTubeInputProps = {
  onSubmit: (youtubeUrl: string) => void;
  disabled?: boolean;
};

export function YouTubeInput({ onSubmit, disabled = false }: YouTubeInputProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const submit = () => {
    const canonical = parseYouTubeUrl(value);
    if (!canonical) {
      setError("Paste a public YouTube watch / Shorts / youtu.be link.");
      return;
    }
    setError("");
    onSubmit(canonical);
  };

  return (
    <div className="border border-border bg-card p-6 sm:p-8">
      <h3 className="font-serif text-2xl text-foreground">YouTube link</h3>
      <p className="mt-2 text-sm text-muted">
        Paste a public video where you speak. We analyze up to the first 4
        minutes for a free EliteSpeak-style report.
      </p>

      <input
        type="url"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          setValue(e.target.value);
          setError("");
        }}
        placeholder="https://www.youtube.com/watch?v=…"
        className="mt-6 w-full border border-border bg-background px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted/60 focus:border-accent disabled:opacity-50"
      />

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <button
        type="button"
        disabled={disabled || !value.trim()}
        onClick={submit}
        className="mt-5 rounded-full bg-accent px-6 py-3 text-sm font-semibold tracking-wide text-accent-dark transition hover:brightness-105 disabled:opacity-50"
      >
        Analyze YouTube video
      </button>
    </div>
  );
}
