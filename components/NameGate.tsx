"use client";

import Image from "next/image";
import { useState, type FormEvent } from "react";
import { validateEmail } from "@/lib/email";
import {
  saveLead,
  type LeadPayload,
} from "@/lib/lead";

export {
  LEAD_STORAGE_KEY,
  readLead,
  saveLead,
  saveKartraLead,
  type LeadPayload,
} from "@/lib/lead";

const PREVIEW_CARDS = [
  { src: "/challenges/rambling.png", label: "Rambling", rotate: -6 },
  { src: "/challenges/confidence.png", label: "Confidence", rotate: 0 },
  { src: "/challenges/clarity.png", label: "Clarity", rotate: 6 },
] as const;

type NameGateProps = {
  onComplete: (lead: LeadPayload) => void;
  onBack?: () => void;
};

/** Legacy name/email gate — funnel now uses KartraGate. Kept for reference. */
export function NameGate({ onComplete, onBack }: NameGateProps) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const first = firstName.trim();
    if (!first) {
      setError("Enter your first name to continue.");
      return;
    }
    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      setError(emailCheck.error);
      return;
    }
    const name = [first, lastName.trim()].filter(Boolean).join(" ");
    const lead: LeadPayload = {
      name,
      email: emailCheck.email,
      source: "namegate",
      at: Date.now(),
    };
    saveLead(lead);
    void fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    }).catch(() => {
      // demo noop
    });
    onComplete(lead);
  };

  return (
    <section className="mx-auto flex min-h-[80dvh] w-full max-w-lg flex-col justify-center px-4 py-12 animate-fade-up">
      <h1 className="text-center text-2xl font-extrabold leading-tight tracking-tight sm:text-3xl">
        Get your free personalized communication diagnosis
      </h1>
      <p className="mt-3 text-center text-sm text-muted">
        Takes under a minute to start. Audio only — 30 seconds to 2 minutes.
      </p>

      <div className="mt-8 flex justify-center gap-2 overflow-hidden px-2">
        {PREVIEW_CARDS.map((card, i) => (
          <div
            key={card.label}
            className={`relative h-28 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:h-36 sm:w-28 ${
              i === 1 ? "z-10 scale-105 border-accent/40 shadow-md" : "opacity-80"
            }`}
            style={{ transform: `rotate(${card.rotate}deg)` }}
          >
            <Image
              src={card.src}
              alt={card.label}
              fill
              className="object-cover object-center"
              sizes="112px"
            />
          </div>
        ))}
      </div>

      <form onSubmit={submit} className="mt-10 space-y-4">
        <p className="text-center text-base font-semibold">
          What&apos;s your <span className="font-extrabold">name</span>?
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            autoComplete="given-name"
            placeholder="FIRST NAME"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setError("");
            }}
            className="min-h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none placeholder:text-muted/70 focus:border-accent"
          />
          <input
            type="text"
            autoComplete="family-name"
            placeholder="LAST NAME"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="min-h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none placeholder:text-muted/70 focus:border-accent"
          />
        </div>
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="EMAIL"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          className="min-h-12 w-full rounded-xl border border-border bg-card px-4 text-base outline-none placeholder:text-muted/70 focus:border-accent"
        />
        {error && (
          <p className="text-center text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="btn-primary uppercase tracking-wide">
          Let&apos;s Start
        </button>
      </form>

      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="mt-6 text-sm text-muted underline-offset-2 hover:text-foreground hover:underline"
        >
          ← Back
        </button>
      )}
    </section>
  );
}
