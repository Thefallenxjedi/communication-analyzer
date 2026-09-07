import { convexAuthNextjsToken } from "@convex-dev/auth/nextjs/server";
import { getConvexHttpClient, staffApi } from "@/lib/convex-server";
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
  let data = (await convex.query(staffApi.getMyStaff, {})) as MyStaffResponse;

  if (data.authenticated && !data.staffRole) {
    const bootstrap = (await convex.mutation(staffApi.tryBootstrapAdmin, {})) as {
      applied?: boolean;
      staffRole?: StaffRole;
    };
    if (bootstrap.applied && bootstrap.staffRole) {
      data = (await convex.query(staffApi.getMyStaff, {})) as MyStaffResponse;
    }
  }

  return data;
}

export async function resolveStaffAccess(
  _request: Request,
): Promise<StaffSession | null> {
  const data = await fetchMyStaffFromConvex();
  if (data.authenticated && data.staffRole) {
    return {
      email: data.email ?? "",
      name: data.name,
      staffRole: data.staffRole,
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

export async function requireStaffConvex(
  request: Request,
  minimum: StaffRole = "viewer",
) {
  const access = await requireStaff(request, minimum);
  if (access instanceof Response) return access;

  const convex = await getAuthedConvexClient();
  if (!convex) {
    return Response.json({ error: "Sign in required." }, { status: 401 });
  }

  return convex;
}
