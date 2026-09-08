"use client";

import { useRef, useState, type FormEvent } from "react";

type ProfileMode = "social" | "pdf" | "text";

export function ProfilesMark({ className = "es-li-mark" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="8" cy="8" r="3.2" fill="currentColor" />
      <circle cx="17" cy="7" r="2.4" fill="currentColor" opacity=".72" />
      <path
        d="M2.8 19.2c.5-4.1 2.2-6.2 5.2-6.2s4.8 2.1 5.2 6.2M13.2 13.1c1-.8 2.2-1.2 3.6-1.2 2.5 0 4 1.8 4.4 5.4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function profileLines(value: string): string[] {
  return value
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line, index, lines) => lines.indexOf(line) === index)
    .slice(0, 8);
}

export function ProfilesUpload({
  name,
  submitted,
  initialProfiles,
  readOnly = false,
  onSaved,
}: {
  name: string;
  submitted: boolean;
  initialProfiles: string[];
  readOnly?: boolean;
  onSaved: () => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<ProfileMode>("social");
  const [file, setFile] = useState<File | null>(null);
  const [profileText, setProfileText] = useState("");
  const [socialText, setSocialText] = useState(initialProfiles.join("\n"));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (readOnly || busy) return;
    const socialProfiles = profileLines(socialText);
    if (mode === "social" && socialProfiles.length === 0) {
      setError("Add at least one profile URL or social handle.");
      return;
    }
    if (mode === "pdf" && !file) {
      inputRef.current?.click();
      return;
    }
    if (mode === "pdf" && file?.type && file.type !== "application/pdf") {
      setError("Use the PDF LinkedIn gives you.");
      return;
    }
    if (mode === "text" && profileText.trim().length < 120) {
      setError("Paste more of your professional profile text.");
      return;
    }

    setBusy(true);
    setError("");
    try {
      let storageId: string | undefined;
      if (mode === "pdf" && file) {
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
          socialProfiles,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save profiles.");
      setFile(null);
      setProfileText("");
      await onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save profiles.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="es-li">
      <ProfilesMark className="es-li-logo es-profiles-logo" />
      <p className="es-li-why">
        Share the professional and social profiles that best represent you.
        EliteSpeak uses only the information you submit to tailor practice
        questions and exercises.
      </p>
      {submitted ? (
        <p className="es-li-submitted">
          <span className="es-task-done-mark">✓</span>
          Profiles saved for {name}
        </p>
      ) : null}
      <div className="es-li-choice es-li-choice--three">
        {([
          ["social", "Social handles"],
          ["pdf", "LinkedIn PDF"],
          ["text", "Profile text"],
        ] as const).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={
              mode === value
                ? "es-li-choice-btn es-li-choice-btn--active"
                : "es-li-choice-btn"
            }
            onClick={() => {
              setMode(value);
              setError("");
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={(e) => void onSubmit(e)} className="es-li-form">
        {mode === "social" ? (
          <label className="es-li-text-area">
            <span>Profile URLs or handles — one per line</span>
            <textarea
              value={socialText}
              onChange={(e) => {
                setSocialText(e.target.value);
                setError("");
              }}
              rows={7}
              placeholder={"https://linkedin.com/in/your-name\n@yourhandle\nhttps://instagram.com/yourhandle"}
              disabled={readOnly}
            />
          </label>
        ) : mode === "pdf" ? (
          <>
            <p className="es-li-note">
              Export your LinkedIn profile from its 3-dot menu using
              <strong> Save to PDF</strong>, then upload it here.
            </p>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              disabled={readOnly}
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setError("");
              }}
            />
            {file ? <p className="es-li-file-name">{file.name}</p> : null}
          </>
        ) : (
          <label className="es-li-text-area">
            <span>Paste professional profile text</span>
            <textarea
              value={profileText}
              onChange={(e) => {
                setProfileText(e.target.value);
                setError("");
              }}
              rows={9}
              placeholder="Include your headline, About, experience, education, and skills."
              disabled={readOnly}
            />
          </label>
        )}
        {error ? <p className="es-li-error">{error}</p> : null}
        <button
          type={mode === "pdf" && !file ? "button" : "submit"}
          disabled={busy || readOnly}
          className="es-btn es-li-submit"
          onClick={
            mode === "pdf" && !file && !readOnly
              ? () => inputRef.current?.click()
              : undefined
          }
        >
          {readOnly ? "Read-only demo" : busy ? "Saving…" : submitted ? "Update profiles" : "Save profiles"}
        </button>
      </form>
    </div>
  );
}
