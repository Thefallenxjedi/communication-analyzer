"use client";

import { useState, type FormEvent } from "react";

const STEPS = [
  "Open your profile",
  "Open the 3 dots menu",
  "Click Save to PDF",
];

export function LinkedInMark({ className = "es-li-mark" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <rect width="24" height="24" rx="4" fill="#0A66C8" />
      <path
        fill="#fff"
        d="M8.34 9.54H6.08V18h2.26V9.54zM7.2 5.4A1.32 1.32 0 1 0 7.21 8a1.32 1.32 0 0 0-.01-2.6zM18.1 18h-2.26v-4.12c0-.98-.02-2.24-1.37-2.24-1.37 0-1.58 1.07-1.58 2.17V18H10.64V9.54h2.16v1.16h.03c.3-.57 1.04-1.17 2.14-1.17 2.29 0 2.71 1.51 2.71 3.47V18z"
      />
    </svg>
  );
}

export function LinkedInUpload({
  name,
  done,
  onSaved,
}: {
  name: string;
  done: boolean;
  onSaved: () => Promise<void> | void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (done) return;
    if (!file) {
      setError("Choose the LinkedIn PDF first.");
      return;
    }
    if (file.type && file.type !== "application/pdf") {
      setError("Use the PDF LinkedIn gives you.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const urlRes = await fetch("/api/client/workouts/upload", { method: "POST" });
      const urlData = (await urlRes.json()) as {
        uploadUrl?: string;
        error?: string;
      };
      if (!urlRes.ok || !urlData.uploadUrl) {
        throw new Error(urlData.error || "Could not start upload.");
      }
      const uploaded = await fetch(urlData.uploadUrl, {
        method: "POST",
        headers: { "Content-Type": "application/pdf" },
        body: file,
      });
      if (!uploaded.ok) throw new Error("Upload failed.");
      const stored = (await uploaded.json()) as { storageId?: string };
      if (!stored.storageId) throw new Error("Upload did not return a file id.");

      const res = await fetch("/api/client/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ storageId: stored.storageId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setFile(null);
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="es-li es-li--done">
        <LinkedInMark className="es-li-logo" />
        <p className="es-li-submitted">
          <span className="es-task-done-mark">✓</span>
          Submitted
        </p>
        <p className="es-li-lead">{name}, your coach has this profile.</p>
      </div>
    );
  }

  return (
    <div className="es-li">
      <LinkedInMark className="es-li-logo" />
      <p className="es-li-why">
        Your coach wants to help you where it actually matters — what could be
        better, what you already do, and what to improve. That is why we ask
        for LinkedIn.
      </p>
      <ol className="es-li-steps">
        {STEPS.map((step, i) => (
          <li key={step}>
            <span>{i + 1}</span>
            {step}
          </li>
        ))}
      </ol>
      <figure className="es-li-guide">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/client/linkedin-save-guide.jpg"
          alt="How to save your LinkedIn profile as a PDF: open your profile, open the 3 dots menu, click Save to PDF."
        />
      </figure>
      <form onSubmit={(e) => void onSubmit(e)} className="es-li-form">
        <label className="es-li-file">
          <span>{file ? file.name : "Choose PDF"}</span>
          <input
            type="file"
            accept="application/pdf,.pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>
        {error ? <p className="es-li-error">{error}</p> : null}
        <button type="submit" disabled={busy || !file} className="es-btn es-li-submit">
          {busy ? "Saving…" : "Send to your coach"}
        </button>
      </form>
    </div>
  );
}
