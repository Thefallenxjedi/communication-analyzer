"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ClientAuthShell } from "@/components/ClientAuthShell";

/** Legacy waiting page — pending approval is removed; send people into the portal. */
export default function ClientWaitingPage() {
  const router = useRouter();

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
      if (data.needsRegistration) {
        router.replace("/client/register");
        return;
      }
      router.replace("/client");
    })();
  }, [router]);

  return (
    <ClientAuthShell panelLabel="Opening portal">
      <h2 className="es-login-panel-title">Opening your portal</h2>
      <p className="es-login-panel-sub">One moment…</p>
    </ClientAuthShell>
  );
}
