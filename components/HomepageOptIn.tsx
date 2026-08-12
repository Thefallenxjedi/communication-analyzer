"use client";

import { useState, type FormEvent } from "react";
import { validateEmail } from "@/lib/email";
import { getOrCreateAnonymousId } from "@/lib/anonymous-id";
import { saveLead, type LeadPayload } from "@/lib/lead";

type HomepageOptInProps = {
  onComplete: (lead: LeadPayload) => void;
};

export function HomepageOptIn({ onComplete }: HomepageOptInProps) {
  const [firstName, setFirstName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    const first = firstName.trim().split(/\s+/)[0];
    if (!first) {
      setError("Enter your first name.");
      return;
    }
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      setError(emailCheck.error);
      return;
    }

    setBusy(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: first,
          email: emailCheck.email,
          anonymousId: getOrCreateAnonymousId(),
          source: "homepage",
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not save your details.");
      }

      const lead: LeadPayload = {
        name: first,
        email: emailCheck.email,
        source: "homepage",
        at: Date.now(),
      };
      saveLead(lead);
      onComplete(lead);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
      <p className="text-sm font-extrabold text-foreground">
        Get your free report
      </p>
      <p className="text-xs text-muted">
        Enter your name and email to start the speaking diagnosis.
      </p>
      <input
        type="text"
        autoComplete="given-name"
        placeholder="First name"
        value={firstName}
        onChange={(e) => {
          setFirstName(e.target.value);
          setError("");
        }}
        className="min-h-11 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-accent"
        disabled={busy}
      />
      <input
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder="Email"
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setError("");
        }}
        className="min-h-11 w-full rounded-xl border border-border bg-card px-4 text-sm outline-none focus:border-accent"
        disabled={busy}
      />
      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full uppercase tracking-wide"
      >
        {busy ? "Starting…" : "Start my free diagnosis"}
      </button>
    </form>
  );
}
