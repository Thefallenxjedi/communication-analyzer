"use client";

import Link from "next/link";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useAdminStaff } from "@/components/AdminShell";

export function AdminHeader() {
  const { staff, canManageTeam } = useAdminStaff();
  const { signOut } = useAuthActions();
  const router = useRouter();

  async function onSignOut() {
    await signOut();
    router.replace("/admin/login");
  }

  return (
    <header className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-teal-700">
          EliteSpeak Admin
        </p>
        <p className="text-sm text-muted">
          {staff.name || staff.email}
          <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-700">
            {staff.staffRole}
          </span>
        </p>
      </div>
      <nav className="flex flex-wrap items-center gap-3 text-sm font-semibold">
        <Link href="/admin" className="text-teal-700 hover:text-teal-900">
          Analysis
        </Link>
        <Link href="/admin/clients" className="text-teal-700 hover:text-teal-900">
          Clients
        </Link>
        <Link href="/admin/prompt" className="text-teal-700 hover:text-teal-900">
          Prompt
        </Link>
        <Link href="/admin/status" className="text-teal-700 hover:text-teal-900">
          Status
        </Link>
        {canManageTeam ? (
          <Link href="/admin/team" className="text-teal-700 hover:text-teal-900">
            Team
          </Link>
        ) : null}
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="text-muted hover:text-slate-900"
        >
          Sign out
        </button>
      </nav>
    </header>
  );
}
