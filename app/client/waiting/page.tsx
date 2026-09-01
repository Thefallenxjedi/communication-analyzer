"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ClientAuthShell } from "@/components/ClientAuthShell";

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
    <ClientAuthShell panelLabel="Account pending">
      <div className="es-login-wait-mark" aria-hidden>
        <span className="es-login-wait-ring" />
      </div>
      <h2 className="es-login-panel-title">Access coming soon</h2>
      <p className="es-login-panel-sub">
        {name ? `${name}, we` : "We"} will soon give you access to your program.
        Your coach is reviewing your account — check back shortly.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onLogout()}
        className="es-login-signout"
      >
        Sign out
      </button>
    </ClientAuthShell>
  );
}
