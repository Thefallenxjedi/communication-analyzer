import { formatConvexError, getConvexHttpClient, workoutCatalogApi } from "@/lib/convex-server";
import {
  listAdminCatalogExercises,
  seedProblemBibleCatalog,
} from "@/lib/workout-exercises";
import { requireStaffConvex } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(request: Request) {
  const convex = await requireStaffConvex(request, "viewer");
  if (convex instanceof Response) return convex;

  try {
    const exercises = await listAdminCatalogExercises(convex);
    return Response.json({
      exercises,
      count: exercises.length,
      seeded: exercises.some((e) => e.source === "problem-bible"),
    });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  let body: {
    action?: string;
    insertOnlyMissing?: boolean;
    id?: string;
    slug?: string;
    name?: string;
    purpose?: string;
    problemItSolves?: string;
    instructions?: string;
    whenToUse?: string;
    tags?: string[];
    timing?: string;
    timingMinutes?: number;
    problemNumber?: number;
    problemTitle?: string;
    exerciseIndex?: number;
    timelineSummary?: string;
    source?: string;
    enabled?: boolean;
    sortOrder?: number;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const action = body.action?.trim() || "upsert";

  try {
    if (action === "seed") {
      const result = await seedProblemBibleCatalog({
        insertOnlyMissing: body.insertOnlyMissing === true,
        convex,
      });
      const exercises = await listAdminCatalogExercises(convex);
      return Response.json({ ok: true, ...result, exercises });
    }

    if (action === "setEnabled") {
      if (!body.id || typeof body.enabled !== "boolean") {
        return Response.json(
          { error: "id and enabled required." },
          { status: 400 },
        );
      }
      await convex.mutation(workoutCatalogApi.setEnabled, {
        id: body.id as never,
        enabled: body.enabled,
      });
      return Response.json({ ok: true });
    }

    if (action === "remove") {
      if (!body.id) {
        return Response.json({ error: "id required." }, { status: 400 });
      }
      await convex.mutation(workoutCatalogApi.remove, {
        id: body.id as never,
      });
      return Response.json({ ok: true });
    }

    // upsert
    if (!body.slug || !body.name || !body.purpose || !body.instructions || !body.whenToUse || !body.timing) {
      return Response.json(
        {
          error:
            "slug, name, purpose, instructions, whenToUse, and timing are required.",
        },
        { status: 400 },
      );
    }

    const result = await convex.mutation(workoutCatalogApi.upsert, {
      id: body.id ? (body.id as never) : undefined,
      slug: body.slug,
      name: body.name,
      purpose: body.purpose,
      problemItSolves: body.problemItSolves ?? "",
      instructions: body.instructions,
      whenToUse: body.whenToUse,
      tags: Array.isArray(body.tags) ? body.tags : [],
      timing: body.timing,
      timingMinutes: body.timingMinutes,
      problemNumber: body.problemNumber,
      problemTitle: body.problemTitle,
      exerciseIndex: body.exerciseIndex,
      timelineSummary: body.timelineSummary,
      source: body.source,
      enabled: body.enabled,
      sortOrder: body.sortOrder,
    });

    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err) },
      { status: 500 },
    );
  }
}
