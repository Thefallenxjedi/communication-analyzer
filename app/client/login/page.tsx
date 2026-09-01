"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export default function ClientLoginPage() {
  const { signIn } = useAuthActions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onGoogleSignIn() {
    setBusy(true);
    setError("");
    try {
      await signIn("google", { redirectTo: "/client" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="es-wordmark es-wordmark--login">EliteSpeak</p>
      <h1 className="mt-5 text-3xl">Client login</h1>
      <p className="mt-3 text-sm text-muted">
        Sign in with Google. Your coach will approve new accounts before you can
        access your program.
      </p>
      <div className="mt-10 space-y-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onGoogleSignIn()}
          className="es-btn w-full min-h-12"
        >
          {busy ? "Redirecting…" : "Continue with Google"}
        </button>
        {error ? (
          <p className="text-sm" style={{ color: "var(--es-ember)" }}>
            {error}
          </p>
        ) : null}
      </div>
    </main>
  );
}
