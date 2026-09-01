"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ClientWaitingPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/client/session");
      const data = (await res.json()) as {
        authenticated?: boolean;
        needsRegistration?: boolean;
        client?: { name?: string; status?: string } | null;
      };
      if (!res.ok || !data.authenticated) {
        router.replace("/client/login");
        return;
      }
      if (data.needsRegistration) {
        router.replace("/client/register");
        return;
      }
      if (data.client?.status === "active") {
        router.replace("/client");
        return;
      }
      setName(data.client?.name ?? "");
    })();
  }, [router]);

  async function onLogout() {
    setBusy(true);
    await signOut();
    router.replace("/client/login");
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center px-6 py-16">
      <p className="es-wordmark es-wordmark--login">EliteSpeak</p>
      <h1 className="mt-5 text-3xl">Waiting for approval</h1>
      <p className="mt-3 text-sm text-muted">
        {name ? `${name}, your` : "Your"} coach will review your account soon.
        You will get access to your sessions and tasks once approved.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onLogout()}
        className="mt-10 text-sm font-semibold text-muted underline-offset-2 hover:underline"
      >
        Sign out
      </button>
    </main>
  );
}
