import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

const EMAIL_MAX = 200;

export const staffRoleValidator = v.union(
  v.literal("viewer"),
  v.literal("editor"),
  v.literal("admin"),
);

export type StaffRole = "viewer" | "editor" | "admin";

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, EMAIL_MAX);
}

async function requireStaffUser(ctx: QueryCtx | MutationCtx, minimum: StaffRole) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated.");

  const user = await ctx.db.get(userId);
  if (!user?.staffRole) throw new Error("Not authorized for admin.");

  const rank = { viewer: 1, editor: 2, admin: 3 } as const;
  if (rank[user.staffRole] < rank[minimum]) {
    throw new Error("Insufficient permission.");
  }

  return { userId, user };
}

export async function applyBootstrapAdmin(
  ctx: MutationCtx,
  userId: Id<"users">,
  email: string,
): Promise<void> {
  const bootstrap = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase();
  if (!bootstrap || normalizeEmail(email) !== bootstrap) return;

  const admins = await ctx.db
    .query("users")
    .withIndex("by_staffRole", (q) => q.eq("staffRole", "admin"))
    .take(1);

  if (admins.length > 0) return;

  await ctx.db.patch(userId, {
    staffRole: "admin",
    updatedAt: Date.now(),
  });
}

export const getMyStaff = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return { authenticated: false as const };
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return { authenticated: true as const, staffRole: null as null };
    }

    return {
      authenticated: true as const,
      email: user.email ?? "",
      name: user.name,
      staffRole: user.staffRole ?? null,
    };
  },
});

export const listStaff = query({
  args: {},
  handler: async (ctx) => {
    await requireStaffUser(ctx, "admin");

    const rows = await ctx.db.query("users").collect();
    return rows
      .filter((row) => row.staffRole)
      .map((row) => ({
        id: row._id,
        email: row.email ?? "",
        name: row.name ?? "",
        staffRole: row.staffRole as StaffRole,
        updatedAt: row.updatedAt ?? row._creationTime,
      }))
      .sort((a, b) => a.email.localeCompare(b.email));
  },
});

export const setStaffRole = mutation({
  args: {
    email: v.string(),
    staffRole: v.union(staffRoleValidator, v.null()),
  },
  handler: async (ctx, args) => {
    await requireStaffUser(ctx, "admin");

    const email = normalizeEmail(args.email);
    if (!email || !email.includes("@")) {
      throw new Error("Valid email required.");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .unique();

    if (!user) {
      throw new Error("No user with that email. They must sign in with Google once first.");
    }

    if (args.staffRole === null) {
      if (user.staffRole === "admin") {
        const otherAdmins = await ctx.db
          .query("users")
          .withIndex("by_staffRole", (q) => q.eq("staffRole", "admin"))
          .collect();
        if (otherAdmins.length <= 1) {
          throw new Error("Cannot remove the only admin.");
        }
      }
      await ctx.db.patch(user._id, {
        staffRole: undefined,
        updatedAt: Date.now(),
      });
      return { ok: true as const };
    }

    await ctx.db.patch(user._id, {
      staffRole: args.staffRole,
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});
