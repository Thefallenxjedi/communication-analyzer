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
    <ClientAuthShell
      panelLabel="Welcome back"
      footer={
        <p className="es-login-help">
          Need help accessing your account?
          <br />
          <a href="mailto:info@elitespeak.org">info@elitespeak.org</a>
        </p>
      }
    >
      <h2 className="es-login-panel-title">Welcome back</h2>
      <p className="es-login-panel-sub">
        Sign in to continue your EliteSpeak training.
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
      <p className="es-login-account-note">
        Use the Google account associated with your EliteSpeak enrollment.
      </p>
      {error ? <p className="es-login-error">{error}</p> : null}
    </ClientAuthShell>
  );
}
