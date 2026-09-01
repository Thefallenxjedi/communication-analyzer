import {
  fetchMyStaffFromConvex,
  getAuthedConvexClient,
  requireStaff,
} from "@/lib/staff-auth";
import { staffApi, formatConvexError, isConvexConfigured } from "@/lib/convex-server";
import type { StaffRole } from "@/lib/staff-types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured.", authenticated: false }, { status: 503 });
  }

  try {
    const data = await fetchMyStaffFromConvex();
    const url = new URL(request.url);
    const wantTeam = url.searchParams.get("team") === "1";

    if (!wantTeam) {
      return Response.json(data);
    }

    const access = await requireStaff(request, "admin");
    if (access instanceof Response) return access;

    const client = await getAuthedConvexClient();
    if (!client) {
      return Response.json({ error: "Not configured." }, { status: 503 });
    }

    const team = await client.query(staffApi.listStaff, {});
    return Response.json({ ...data, team });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err), authenticated: false },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!isConvexConfigured()) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  const access = await requireStaff(request, "admin");
  if (access instanceof Response) return access;

  let body: { email?: string; staffRole?: StaffRole | null };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const email = body.email?.trim();
  if (!email) {
    return Response.json({ error: "email required." }, { status: 400 });
  }

  const client = await getAuthedConvexClient();
  if (!client) {
    return Response.json({ error: "Not configured." }, { status: 503 });
  }

  try {
    await client.mutation(staffApi.setStaffRole, {
      email,
      staffRole: body.staffRole ?? null,
    });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: formatConvexError(err) }, { status: 500 });
  }
}
