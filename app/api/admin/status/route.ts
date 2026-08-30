import { checkAdminAuth, isAdminConfigured } from "@/lib/admin-auth";
import { runSystemStatusChecks } from "@/lib/admin-status";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isAdminConfigured()) {
    return Response.json(
      { error: "ADMIN_PASSWORD is not configured." },
      { status: 503 },
    );
  }
  if (!checkAdminAuth(request)) {
    return Response.json({ error: "Wrong admin password." }, { status: 401 });
  }

  try {
    const report = await runSystemStatusChecks();
    return Response.json(report);
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "Could not run status checks.",
      },
      { status: 500 },
    );
  }
}
