import { getAuthUserId } from "@convex-dev/auth/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

export type AdminStaffRole = "viewer" | "editor" | "admin";

const STAFF_RANK: Record<AdminStaffRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

export async function requireStaffRole(
  ctx: QueryCtx | MutationCtx,
  minimum: AdminStaffRole,
) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated.");

  const user = await ctx.db.get(userId);
  const role = user?.staffRole as AdminStaffRole | undefined;
  if (!role) throw new Error("Not authorized for admin.");
  if (STAFF_RANK[role] < STAFF_RANK[minimum]) {
    throw new Error("Insufficient permission.");
  }

  return { userId, user, role };
}
