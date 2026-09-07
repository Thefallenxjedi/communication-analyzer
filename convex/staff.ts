import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
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

async function findUserByEmail(ctx: QueryCtx | MutationCtx, email: string) {
  const indexed = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .take(2);
  if (indexed.length > 0) return indexed[0];

  return await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("email"), email))
    .first();
}

async function findStaffInvite(ctx: QueryCtx | MutationCtx, email: string) {
  const indexed = await ctx.db
    .query("staffInvites")
    .withIndex("by_email", (q) => q.eq("email", email))
    .take(2);
  if (indexed.length > 0) return indexed[0];

  return await ctx.db
    .query("staffInvites")
    .filter((q) => q.eq(q.field("email"), email))
    .first();
}

export async function applyStaffInvite(
  ctx: MutationCtx,
  userId: Id<"users">,
  email: string,
): Promise<void> {
  const invite = await findStaffInvite(ctx, normalizeEmail(email));
  if (!invite) return;

  await ctx.db.patch(userId, {
    staffRole: invite.staffRole,
    updatedAt: Date.now(),
  });
  await ctx.db.delete(invite._id);
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

async function adminCount(ctx: QueryCtx | MutationCtx) {
  const admins = await ctx.db
    .query("users")
    .withIndex("by_staffRole", (q) => q.eq("staffRole", "admin"))
    .take(2);
  return admins.length;
}

export const tryBootstrapAdmin = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { applied: false as const };

    const user = await ctx.db.get(userId);
    if (!user?.email) return { applied: false as const };
    if (user.staffRole) {
      return { applied: false as const, staffRole: user.staffRole };
    }

    await applyStaffInvite(ctx, userId, user.email);
    await applyBootstrapAdmin(ctx, userId, user.email);
    const updated = await ctx.db.get(userId);
    if (!updated?.staffRole) return { applied: false as const };

    return { applied: true as const, staffRole: updated.staffRole };
  },
});

/** Break-glass: restore admin when every admin user was deleted. */
export const recoverFirstAdmin = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!email || !email.includes("@")) {
      throw new Error("Valid email required.");
    }
    if ((await adminCount(ctx)) > 0) {
      return { ok: false as const, reason: "admins_exist" as const };
    }

    const now = Date.now();
    const user = await findUserByEmail(ctx, email);
    if (user) {
      await ctx.db.patch(user._id, {
        staffRole: "admin",
        updatedAt: now,
      });
      return { ok: true as const, restored: "user" as const };
    }

    const invite = await findStaffInvite(ctx, email);
    if (invite) {
      await ctx.db.patch(invite._id, {
        staffRole: "admin",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("staffInvites", {
        email,
        staffRole: "admin",
        createdAt: now,
        updatedAt: now,
      });
    }
    return { ok: true as const, restored: "invite" as const };
  },
});

async function deleteOrphanAuthRows(ctx: MutationCtx) {
  const accounts = await ctx.db.query("authAccounts").collect();
  for (const row of accounts) {
    const owner = await ctx.db.get(row.userId);
    if (!owner) await ctx.db.delete(row._id);
  }
  const sessions = await ctx.db.query("authSessions").collect();
  for (const row of sessions) {
    const owner = await ctx.db.get(row.userId);
    if (!owner) await ctx.db.delete(row._id);
  }
}

export const inspectAdminEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const users = (await ctx.db.query("users").collect())
      .filter((row) => (row.email || "").trim().toLowerCase() === email)
      .map((row) => ({
        id: row._id,
        email: row.email ?? "",
        name: row.name ?? "",
        role: row.role ?? null,
        staffRole: row.staffRole ?? null,
      }));
    const invites = (await ctx.db.query("staffInvites").collect())
      .filter((row) => row.email === email)
      .map((row) => ({
        id: row._id,
        email: row.email,
        staffRole: row.staffRole,
      }));
    return { email, users, invites };
  },
});

export const restoreAdminByEmail = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    if (!email || !email.includes("@")) {
      throw new Error("Valid email required.");
    }

    const now = Date.now();
    await deleteOrphanAuthRows(ctx);

    let user = await findUserByEmail(ctx, email);
    if (!user) {
      const userId = await ctx.db.insert("users", {
        name: email.split("@")[0],
        email,
        staffRole: "admin",
        createdAt: now,
        updatedAt: now,
      });
      user = await ctx.db.get(userId);
    } else if (user.staffRole !== "admin") {
      await ctx.db.patch(user._id, {
        staffRole: "admin",
        updatedAt: now,
      });
    }

    const invite = await findStaffInvite(ctx, email);
    if (invite) {
      await ctx.db.patch(invite._id, {
        staffRole: "admin",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("staffInvites", {
        email,
        staffRole: "admin",
        createdAt: now,
        updatedAt: now,
      });
    }
    return {
      ok: true as const,
      restored: "user" as const,
      email,
      staffRole: "admin" as const,
      userId: user?._id,
    };
  },
});

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
    const members = rows
      .filter((row) => row.staffRole)
      .map((row) => ({
        id: row._id,
        email: row.email ?? "",
        name: row.name ?? "",
        staffRole: row.staffRole as StaffRole,
        updatedAt: row.updatedAt ?? row._creationTime,
        pending: false as const,
      }))
      .sort((a, b) => a.email.localeCompare(b.email));

    const invites = await ctx.db.query("staffInvites").collect();
    const pending = invites
      .map((row) => ({
        id: row._id,
        email: row.email,
        name: "",
        staffRole: row.staffRole as StaffRole,
        updatedAt: row.updatedAt,
        pending: true as const,
      }))
      .sort((a, b) => a.email.localeCompare(b.email));

    return { members, pending };
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

    const user = await findUserByEmail(ctx, email);
    const invite = await findStaffInvite(ctx, email);

    if (args.staffRole === null) {
      if (invite) await ctx.db.delete(invite._id);
      if (!user) return { ok: true as const };

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

    if (!user) {
      const now = Date.now();
      if (invite) {
        await ctx.db.patch(invite._id, {
          staffRole: args.staffRole,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert("staffInvites", {
          email,
          staffRole: args.staffRole,
          createdAt: now,
          updatedAt: now,
        });
      }
      return { ok: true as const, pending: true as const };
    }

    if (invite) await ctx.db.delete(invite._id);

    await ctx.db.patch(user._id, {
      staffRole: args.staffRole,
      updatedAt: Date.now(),
    });
    return { ok: true as const };
  },
});
