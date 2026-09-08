import {
  confirmCatalogImport,
  parseCatalogImportText,
  type ImportExerciseDraft,
} from "@/lib/exercise-catalog-import";
import {
  invalidateExerciseRagCache,
  warmCatalogEmbeddings,
} from "@/lib/exercise-rag";
import {
  formatConvexError,
  workoutCatalogApi,
} from "@/lib/convex-server";
import {
  listAdminCatalogExercises,
  listCatalogExercises,
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
    warmRag?: boolean;
    text?: string;
    batchIndex?: number;
    batchesPerRequest?: number;
    drafts?: ImportExerciseDraft[];
    id?: string;
    ids?: string[];
    all?: boolean;
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
      invalidateExerciseRagCache();
      const exercises = await listAdminCatalogExercises(convex);
      return Response.json({ ok: true, ...result, exercises });
    }

    if (action === "parseImport") {
      const text = body.text?.trim() || "";
      if (!text) {
        return Response.json({ error: "Paste exercise text to import." }, { status: 400 });
      }
      const batchIndex =
        typeof body.batchIndex === "number" ? body.batchIndex : undefined;
      const parsed = await parseCatalogImportText({
        text,
        batchIndex,
        batchesPerRequest:
          typeof body.batchesPerRequest === "number"
            ? body.batchesPerRequest
            : undefined,
      });
      return Response.json({
        ok: true,
        drafts: parsed.drafts,
        chunkCount: parsed.chunkCount,
        method: parsed.method,
        count: parsed.drafts.length,
        batchIndex: parsed.batchIndex,
        batchCount: parsed.batchCount,
        done: parsed.done === true,
        nextBatchIndex: parsed.nextBatchIndex,
      });
    }

    if (action === "confirmImport") {
      const drafts = Array.isArray(body.drafts) ? body.drafts : [];
      if (!drafts.length) {
        return Response.json({ error: "No drafts to import." }, { status: 400 });
      }
      const result = await confirmCatalogImport({
        drafts,
        insertOnlyMissing: body.insertOnlyMissing === true,
        warmRag: body.warmRag !== false,
        convex,
      });
      const exercises = await listAdminCatalogExercises(convex);
      return Response.json({ ok: true, ...result, exercises });
    }

    if (action === "warmRag") {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim() || "";
      if (!apiKey) {
        return Response.json(
          { error: "GOOGLE_GENERATIVE_AI_API_KEY is not configured." },
          { status: 400 },
        );
      }
      const catalog = await listCatalogExercises({
        enabledOnly: true,
        convex,
      });
      const warmed = await warmCatalogEmbeddings(apiKey, catalog);
      return Response.json({
        ok: true,
        count: warmed.count,
        fingerprint: warmed.fingerprint,
      });
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
      invalidateExerciseRagCache();
      return Response.json({ ok: true });
    }

    if (action === "remove") {
      if (!body.id) {
        return Response.json({ error: "id required." }, { status: 400 });
      }
      await convex.mutation(workoutCatalogApi.remove, {
        id: body.id as never,
      });
      invalidateExerciseRagCache();
      return Response.json({ ok: true });
    }

    if (action === "removeMany") {
      const ids = Array.isArray(body.ids) ? body.ids.filter(Boolean) : [];
      const all = body.all === true;
      if (!all && ids.length === 0) {
        return Response.json(
          { error: "Select exercises to delete, or use delete all." },
          { status: 400 },
        );
      }
      const result = (await convex.mutation(workoutCatalogApi.removeMany, {
        ...(all ? { all: true } : { ids: ids as never[] }),
      })) as { ok?: boolean; deleted?: number };
      invalidateExerciseRagCache();
      const exercises = await listAdminCatalogExercises(convex);
      return Response.json({
        ok: true,
        deleted: result.deleted ?? 0,
        exercises,
      });
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
    invalidateExerciseRagCache();

    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err) },
      { status: 500 },
    );
  }
}
