"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthActions } from "@convex-dev/auth/react";
import { useRouter } from "next/navigation";
import { useAdminStaff } from "@/components/AdminShell";
import type { StaffRole } from "@/lib/staff-types";

type NavItem = {
  href: string;
  label: string;
  isActive: (pathname: string) => boolean;
  adminOnly?: boolean;
  editorOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/admin",
    label: "Analysis",
    isActive: (pathname) => pathname === "/admin",
  },
  {
    href: "/admin/clients",
    label: "Clients",
    isActive: (pathname) => pathname.startsWith("/admin/clients"),
  },
  {
    href: "/admin/tools",
    label: "AI Tools",
    isActive: (pathname) => pathname.startsWith("/admin/tools"),
  },
  {
    href: "/admin/exercises",
    label: "Exercises",
    isActive: (pathname) => pathname.startsWith("/admin/exercises"),
  },
  {
    href: "/admin/status",
    label: "Status",
    isActive: (pathname) => pathname.startsWith("/admin/status"),
  },
  {
    href: "/admin/team",
    label: "Team",
    isActive: (pathname) => pathname.startsWith("/admin/team"),
    adminOnly: true,
  },
];

function roleBadgeClass(role: StaffRole): string {
  if (role === "admin") return "bg-teal-100 text-teal-800";
  if (role === "editor") return "bg-sky-100 text-sky-900";
  return "bg-slate-100 text-slate-700";
}

export function AdminHeader() {
  const pathname = usePathname();
  const { staff, canEdit, canManageTeam } = useAdminStaff();
  const { signOut } = useAuthActions();
  const router = useRouter();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.adminOnly && !canManageTeam) return false;
    if (item.editorOnly && !canEdit) return false;
    return true;
  });

  async function onSignOut() {
    await signOut();
    router.replace("/admin/login");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-white/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto max-w-[90rem] px-4 py-4 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-teal-700">
              EliteSpeak Admin
            </p>
            <p className="mt-0.5 truncate text-sm text-muted">
              {staff.name || staff.email}
              <span
                className={`ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${roleBadgeClass(staff.staffRole)}`}
              >
                {staff.staffRole}
              </span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => void onSignOut()}
            className="inline-flex min-h-10 shrink-0 items-center rounded-xl border border-border bg-white px-4 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
          >
            Sign out
          </button>
        </div>

        <nav
          className="mt-4 -mb-px flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Admin sections"
        >
          {visibleItems.map((item) => {
            const active = item.isActive(pathname);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-11 shrink-0 items-center rounded-xl px-5 text-base font-bold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
                  active
                    ? "bg-teal-600 text-white shadow-md shadow-teal-600/25 ring-2 ring-teal-600/15"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
