"use client";

import { useRef, useState, type FormEvent } from "react";

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"pdf" | "text">("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [profileText, setProfileText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (done || busy) return;
    if (mode === "pdf" && !file) {
      inputRef.current?.click();
      return;
    }
    if (mode === "pdf" && file?.type && file.type !== "application/pdf") {
      setError("Use the PDF LinkedIn gives you.");
      return;
    }
    if (mode === "text" && profileText.trim().length < 120) {
      setError("Paste more of your LinkedIn profile text.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      let storageId: string | undefined;
      if (mode === "pdf") {
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
        storageId = stored.storageId;
      }

      const res = await fetch("/api/client/onboarding", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          storageId,
          profileText: mode === "text" ? profileText.trim() : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save.");
      setFile(null);
      setProfileText("");
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
        Send your LinkedIn profile so your coach can tailor your communication work.
      </p>
      <div className="es-li-choice">
        <button
          type="button"
          className={mode === "pdf" ? "es-li-choice-btn es-li-choice-btn--active" : "es-li-choice-btn"}
          onClick={() => {
            setMode("pdf");
            setError("");
          }}
        >
          Upload LinkedIn PDF
        </button>
        <button
          type="button"
          className={mode === "text" ? "es-li-choice-btn es-li-choice-btn--active" : "es-li-choice-btn"}
          onClick={() => {
            setMode("text");
            setError("");
          }}
        >
          Paste LinkedIn text
        </button>
      </div>
      {mode === "pdf" ? (
        <>
          <p className="es-li-note">
            On LinkedIn, open your profile, open the 3-dot menu, and choose
            <strong> Save to PDF</strong>.
          </p>
          <p className="es-li-note es-li-note--muted">
            Then upload that PDF here.
          </p>
          <figure className="es-li-guide">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/client/linkedin-save-guide.jpg"
              alt="How to save your LinkedIn profile as a PDF: open your profile, open the 3 dots menu, click Save to PDF."
            />
          </figure>
        </>
      ) : (
        <div className="es-li-text-help">
          <p className="es-li-note">
            No PDF is fine. Copy the text from your LinkedIn profile and paste
            it below.
          </p>
          <p className="es-li-note es-li-note--muted">
            Include your headline, About, Experience, Education, and Skills if
            they are available.
          </p>
        </div>
      )}
      <form onSubmit={(e) => void onSubmit(e)} className="es-li-form">
        {mode === "pdf" ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError("");
              }}
            />
            {file ? (
              <button
                type="button"
                className="es-li-file-name"
                onClick={() => inputRef.current?.click()}
              >
                {file.name}
              </button>
            ) : null}
          </>
        ) : (
          <label className="es-li-text-area">
            <span>Paste your LinkedIn text</span>
            <textarea
              value={profileText}
              onChange={(e) => {
                setProfileText(e.target.value);
                setError("");
              }}
              rows={10}
              placeholder={`Headline\nAbout\nExperience\nEducation\nSkills\n\nPaste your profile text here, ${name}.`}
            />
          </label>
        )}
        {error ? <p className="es-li-error">{error}</p> : null}
        <button
          type={mode === "pdf" && !file ? "button" : "submit"}
          disabled={busy}
          className="es-btn es-li-submit"
          onClick={
            mode === "pdf" && !file
              ? () => {
                  setError("");
                  inputRef.current?.click();
                }
              : undefined
          }
        >
          {busy
            ? "Saving…"
            : mode === "pdf"
              ? file
                ? "Send to your coach"
                : "Upload PDF"
              : "Send text to your coach"}
        </button>
      </form>
    </div>
  );
}
