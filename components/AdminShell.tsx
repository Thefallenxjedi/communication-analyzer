"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  canEditStaff,
  canManageTeam,
  type StaffRole,
  type StaffSession,
} from "@/lib/staff-types";

type StaffContextValue = {
  staff: StaffSession;
  refresh: () => Promise<void>;
  canEdit: boolean;
  canManageTeam: boolean;
};

const StaffContext = createContext<StaffContextValue | null>(null);

export function useAdminStaff(): StaffContextValue {
  const ctx = useContext(StaffContext);
  if (!ctx) {
    throw new Error("useAdminStaff must be used within AdminShell");
  }
  return ctx;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isPublic =
    pathname === "/admin/login" || pathname === "/admin/unauthorized";

  const [status, setStatus] = useState<"loading" | "login" | "forbidden" | "ready">(
    isPublic ? "ready" : "loading",
  );
  const [staff, setStaff] = useState<StaffSession | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/admin/staff");
    const data = (await res.json()) as {
      authenticated?: boolean;
      staffRole?: StaffRole | null;
      email?: string;
      name?: string;
    };

    if (!data.authenticated) {
      setStatus("login");
      setStaff(null);
      return;
    }

    if (!data.staffRole) {
      setStatus("forbidden");
      setStaff(null);
      return;
    }

    setStaff({
      email: data.email ?? "",
      name: data.name,
      staffRole: data.staffRole,
    });
    setStatus("ready");
  }, []);

  useEffect(() => {
    if (isPublic) return;
    void refresh();
  }, [isPublic, refresh]);

  useEffect(() => {
    if (isPublic) return;
    if (status === "login") router.replace("/admin/login");
    if (status === "forbidden") router.replace("/admin/unauthorized");
  }, [isPublic, status, router]);

  const value = useMemo(() => {
    if (!staff) return null;
    return {
      staff,
      refresh,
      canEdit: canEditStaff(staff.staffRole),
      canManageTeam: canManageTeam(staff.staffRole),
    };
  }, [staff, refresh]);

  if (isPublic) {
    return <>{children}</>;
  }

  if (status === "loading" || status === "login" || status === "forbidden") {
    return (
      <main className="mx-auto max-w-lg px-6 py-20 text-center text-sm text-muted">
        Loading admin…
      </main>
    );
  }

  if (!value) return null;

  return <StaffContext.Provider value={value}>{children}</StaffContext.Provider>;
}
