"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function ClientLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/client/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not sign in.");
      }
      router.replace("/client");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <img
        src="/brand/elitespeak-mark.png"
        alt="EliteSpeak"
        className="es-login-mark"
      />
      <h1 className="mt-6 text-3xl">Client login</h1>
      <p className="mt-3 text-sm text-muted">
        Temporary login while we build. Use the email from EliteSpeak Clients.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-10 space-y-5">
        <label className="block text-sm font-medium">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="es-input mt-2"
            autoComplete="email"
            required
          />
        </label>
        {error ? (
          <p className="text-sm" style={{ color: "var(--es-ember)" }}>
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="es-btn w-full min-h-12"
        >
          {busy ? "Checking…" : "Continue"}
        </button>
      </form>
    </main>
  );
}
