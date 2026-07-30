"use client";

import { useState, type FormEvent } from "react";

export const LEAD_STORAGE_KEY = "ca_lead";

export type LeadPayload = {
  name: string;
  email: string;
};

type LeadFormProps = {
  onComplete: (lead: LeadPayload) => void;
  onBack?: () => void;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function saveLead(lead: LeadPayload): void {
  try {
    sessionStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(lead));
  } catch {
    // private mode / quota
  }
}

export function readLead(): LeadPayload | null {
  try {
    const raw = sessionStorage.getItem(LEAD_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as LeadPayload;
    if (parsed?.name && parsed?.email) return parsed;
  } catch {
    // ignore
  }
  return null;
}

export function LeadForm({ onComplete, onBack }: LeadFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Please enter your name.");
      return;
    }
    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email.");
      return;
    }

    setError("");
    setSubmitting(true);

    const lead: LeadPayload = { name: trimmedName, email: trimmedEmail };
    saveLead(lead);

    try {
      await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(lead),
      });
    } catch {
      // noop — demo only; still continue
    }

    setSubmitting(false);
    onComplete(lead);
  };

  return (
    <section className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col justify-center px-6 py-16 animate-fade-up">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neon">
        Almost there
      </p>
      <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white">
        Unlock your free report
      </h2>
      <p className="mt-3 text-sm text-zinc-400">
        Enter your name and email to continue. Takes a few seconds.
      </p>

      <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4">
        <div>
          <label
            htmlFor="lead-name"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400"
          >
            Name
          </label>
          <input
            id="lead-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
            placeholder="Your name"
            className="w-full rounded-xl border border-border bg-white/5 px-4 py-3 text-sm text-foreground outline-none placeholder:text-zinc-500 focus:border-neon disabled:opacity-50"
          />
        </div>
        <div>
          <label
            htmlFor="lead-email"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400"
          >
            Email
          </label>
          <input
            id="lead-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-border bg-white/5 px-4 py-3 text-sm text-foreground outline-none placeholder:text-zinc-500 focus:border-neon disabled:opacity-50"
          />
        </div>

        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="btn-neon w-full rounded-full py-3.5 text-sm tracking-wide disabled:opacity-60"
        >
          {submitting ? "Continuing…" : "Continue to Analyzer"}
        </button>
      </form>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-6 text-sm text-zinc-400 transition hover:text-white"
        >
          ← Back
        </button>
      )}
    </section>
  );
}
