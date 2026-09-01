"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminUnauthorizedPage() {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const [busy, setBusy] = useState(false);

  async function onSignOut() {
    setBusy(true);
    await signOut();
    router.replace("/admin/login");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-2xl font-extrabold text-slate-900">No admin access</h1>
      <p className="mt-3 text-sm text-muted">
        Your Google account is signed in but does not have a staff role yet. Ask
        an admin to assign you viewer, editor, or admin access by email.
      </p>
      <div className="mt-8 flex flex-wrap gap-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void onSignOut()}
          className="text-sm font-semibold text-teal-700 underline-offset-2 hover:underline"
        >
          Sign out
        </button>
        <Link href="/client" className="text-sm font-semibold text-muted hover:text-slate-900">
          Client portal
        </Link>
      </div>
    </main>
  );
}
