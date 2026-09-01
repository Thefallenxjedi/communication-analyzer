"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ClientAuthShell } from "@/components/ClientAuthShell";

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
    <ClientAuthShell panelLabel="Complete registration">
      <h2 className="es-login-panel-title">Almost there</h2>
      <p className="es-login-panel-sub">
        Confirm your name so your coach knows who you are.
      </p>
      <form onSubmit={(e) => void onSubmit(e)} className="es-login-form">
        <label className="es-login-label">
          Your name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="es-input es-login-input"
            autoComplete="name"
            required
            maxLength={80}
          />
        </label>
        {error ? <p className="es-login-error">{error}</p> : null}
        <button
          type="submit"
          disabled={busy || !name.trim()}
          className="es-btn es-login-google-btn"
        >
          {busy ? "Saving…" : "Submit for approval"}
        </button>
      </form>
    </ClientAuthShell>
  );
}
