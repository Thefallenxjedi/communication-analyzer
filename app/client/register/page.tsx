"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

export default function ClientRegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/client/session");
      const data = (await res.json()) as {
        authenticated?: boolean;
        needsRegistration?: boolean;
        client?: { status?: string } | null;
      };
      if (!res.ok || !data.authenticated) {
        router.replace("/client/login");
        return;
      }
      if (!data.needsRegistration && data.client?.status === "active") {
        router.replace("/client");
        return;
      }
      if (!data.needsRegistration && data.client?.status === "pending") {
        router.replace("/client/waiting");
      }
    })();
  }, [router]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/client/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not save.");
      router.replace("/client/waiting");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="es-wordmark es-wordmark--login">EliteSpeak</p>
      <h1 className="mt-5 text-3xl">Almost there</h1>
      <p className="mt-3 text-sm text-muted">
        Confirm your name so your coach knows who you are. After you submit, they
        will approve your account.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="mt-10 space-y-5">
        <label className="block text-sm font-medium">
          Your name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="es-input mt-2"
            autoComplete="name"
            required
            maxLength={80}
          />
        </label>
        {error ? (
          <p className="text-sm" style={{ color: "var(--es-ember)" }}>
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="es-btn w-full min-h-12"
        >
          {busy ? "Saving…" : "Submit for approval"}
        </button>
      </form>
    </main>
  );
}
