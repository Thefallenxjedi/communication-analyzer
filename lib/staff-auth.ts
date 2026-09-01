import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { checkAdminAuth } from "@/lib/admin-auth";
import { coachingApi, getConvexHttpClient, staffApi } from "@/lib/convex-server";
import type { StaffRole, StaffSession } from "@/lib/staff-types";
import { staffMeetsMinimum } from "@/lib/staff-types";

export type MyStaffResponse = {
  authenticated: boolean;
  email?: string;
  name?: string;
  staffRole?: StaffRole | null;
};

export async function fetchMyStaffFromConvex(): Promise<MyStaffResponse> {
  const convex = getConvexHttpClient();
  if (!convex) {
    return { authenticated: false };
  }

  const token = await convexAuthNextjsToken();
  if (!token) {
    return { authenticated: false };
  }

  convex.setAuth(token);
  return (await convex.query(staffApi.getMyStaff, {})) as MyStaffResponse;
}

export async function resolveStaffAccess(
  request: Request,
): Promise<StaffSession | null> {
  const data = await fetchMyStaffFromConvex();
  if (data.authenticated && data.staffRole) {
    return {
      email: data.email ?? "",
      name: data.name,
      staffRole: data.staffRole,
    };
  }

  if (checkAdminAuth(request)) {
    return {
      email: "legacy-admin",
      staffRole: "admin",
    };
  }

  return null;
}

export async function requireStaff(
  request: Request,
  minimum: StaffRole = "viewer",
): Promise<StaffSession | Response> {
  const access = await resolveStaffAccess(request);
  if (!access) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }
  if (!staffMeetsMinimum(access.staffRole, minimum)) {
    return Response.json({ error: "Insufficient permission." }, { status: 403 });
  }
  return access;
}

export async function getAuthedConvexClient() {
  const convex = getConvexHttpClient();
  if (!convex) return null;
  const token = await convexAuthNextjsToken();
  if (!token) return null;
  convex.setAuth(token);
  return convex;
}
