"use client";

import { useState, type FormEvent } from "react";

const STEPS = [
  "Open your LinkedIn profile on a computer (linkedin.com/in/me).",
  "Under your photo, click Resources — or the More button if you do not see Resources.",
  "Click Save to PDF. LinkedIn downloads a file of your profile.",
  "Upload that PDF here. We store it and turn it into a profile for your coach.",
];

export function ClientOnboarding({
  name,
  onDone,
  onLogout,
}: {
  name: string;
  onDone: () => Promise<void> | void;
  onLogout: () => void;
}) {
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [goal, setGoal] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Upload the LinkedIn PDF first.");
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
        body: JSON.stringify({
          role: role.trim(),
          company: company.trim(),
          goal: goal.trim(),
          storageId: stored.storageId,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save.");
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="es-onboard">
      <header className="es-onboard-top">
        <p className="es-wordmark">EliteSpeak</p>
        <button type="button" onClick={onLogout} className="es-client-logout">
          Log out
        </button>
      </header>
      <main className="es-onboard-main">
        <p className="es-onboard-kicker">Before you begin</p>
        <h1 className="es-onboard-title">{name}, a few things first.</h1>
        <p className="es-onboard-lead">
          Your coach uses this so the first call is not a blank page. One pass.
          Then the program opens.
        </p>
        <form onSubmit={(e) => void onSubmit(e)} className="es-onboard-form">
          <label className="es-onboard-label">
            What do you do?
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value.slice(0, 120))}
              className="es-input mt-2"
              placeholder="Role or title"
              required
            />
          </label>
          <label className="es-onboard-label">
            Where do you work?
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value.slice(0, 120))}
              className="es-input mt-2"
              placeholder="Company (optional)"
            />
          </label>
          <label className="es-onboard-label">
            What do you want from this program?
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value.slice(0, 800))}
              className="es-input mt-2"
              rows={4}
              placeholder="The change you want in how you speak"
              required
            />
          </label>

          <div className="es-onboard-pdf">
            <p className="es-onboard-pdf-title">LinkedIn profile PDF</p>
            <ol className="es-onboard-steps">
              {STEPS.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
            <label className="es-onboard-file">
              <span>{file ? file.name : "Choose PDF"}</span>
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          {error ? (
            <p className="es-onboard-error">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={busy || !role.trim() || !goal.trim()}
            className="es-btn es-onboard-submit"
          >
            {busy ? "Saving profile…" : "Enter the program"}
          </button>
        </form>
      </main>
    </div>
  );
}
