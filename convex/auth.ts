import Google from "@auth/core/providers/google";
import { convexAuth } from "@convex-dev/auth/server";
import { applyBootstrapAdmin } from "./staff";

const NAME_MAX = 80;
const EMAIL_MAX = 200;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase().slice(0, EMAIL_MAX);
}

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Google],
  callbacks: {
    async createOrUpdateUser(ctx, { existingUserId, profile, type }) {
      if (type !== "oauth") {
        if (existingUserId) return existingUserId;
        throw new Error("Unsupported sign-in type.");
      }

      const email = profile.email ? normalizeEmail(String(profile.email)) : "";
      const now = Date.now();
      const patch = {
        name:
          typeof profile.name === "string"
            ? profile.name.trim().slice(0, NAME_MAX)
            : undefined,
        email: email || undefined,
        image:
          typeof profile.image === "string" ? profile.image.slice(0, 500) : undefined,
        emailVerificationTime: profile.emailVerified ? now : undefined,
        updatedAt: now,
      };

      if (existingUserId) {
        await ctx.db.patch(existingUserId, patch);
        if (email) await applyBootstrapAdmin(ctx, existingUserId, email);
        return existingUserId;
      }

      if (email) {
        const byEmail = await ctx.db
          .query("users")
          .filter((q) => q.eq(q.field("email"), email))
          .first();
        if (byEmail) {
          await ctx.db.patch(byEmail._id, patch);
          await applyBootstrapAdmin(ctx, byEmail._id, email);
          return byEmail._id;
        }
      }

      const userId = await ctx.db.insert("users", {
        ...patch,
        role: "client",
        createdAt: now,
      });

      if (email) await applyBootstrapAdmin(ctx, userId, email);
      return userId;
    },
  },
});
