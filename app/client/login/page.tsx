"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";
import { ClientAuthShell, GoogleMark } from "@/components/ClientAuthShell";

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
    <ClientAuthShell panelLabel="Sign in">
      <h2 className="es-login-panel-title">Client login</h2>
      <p className="es-login-panel-sub">
        Sign in with Google. Your coach approves new accounts before program
        access.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onGoogleSignIn()}
        className="es-btn es-login-google-btn"
      >
        <GoogleMark />
        {busy ? "Redirecting…" : "Continue with Google"}
      </button>
      {error ? (
        <p className="es-login-error">{error}</p>
      ) : null}
    </ClientAuthShell>
  );
}
