import { adminApiGuard } from "@/lib/admin-route";
import { runSystemStatusChecks } from "@/lib/admin-status";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(request: Request) {
  const denied = await adminApiGuard(request, "viewer");
  if (denied) return denied;

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
