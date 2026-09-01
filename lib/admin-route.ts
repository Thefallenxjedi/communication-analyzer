import { isConvexConfigured } from "@/lib/convex-server";
import { requireStaff } from "@/lib/staff-auth";
import type { StaffRole } from "@/lib/staff-types";

export async function adminApiGuard(
  request: Request,
  minimum: StaffRole = "viewer",
): Promise<Response | null> {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Convex is not configured." }, { status: 503 });
  }
  const access = await requireStaff(request, minimum);
  if (access instanceof Response) return access;
  return null;
}
