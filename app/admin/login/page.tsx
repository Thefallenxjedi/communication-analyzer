"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleMark } from "@/components/ClientAuthShell";

export default function AdminLoginPage() {
  const { signIn } = useAuthActions();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/admin/staff");
        const data = (await res.json()) as {
          authenticated?: boolean;
          staffRole?: string | null;
        };
        if (cancelled) return;
        if (data.authenticated && data.staffRole) {
          router.replace("/admin");
        }
      } catch {
        // stay on login
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function onGoogleSignIn() {
    setBusy(true);
    setError("");
    try {
      await signIn("google", { redirectTo: "/admin" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <p className="text-xs font-bold uppercase tracking-[0.22em] text-teal-700">
        EliteSpeak Admin
      </p>
      <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
        Staff sign in
      </h1>
      <p className="mt-3 text-sm text-muted">
        Use your Google account. Access is limited to viewer, editor, and admin
        roles assigned by your team admin.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onGoogleSignIn()}
        className="mt-10 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-teal-600 px-6 font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-55"
      >
        <GoogleMark />
        {busy ? "Redirecting…" : "Continue with Google"}
      </button>
      {error ? <p className="mt-4 text-sm text-rose-600">{error}</p> : null}
    </main>
  );
}
