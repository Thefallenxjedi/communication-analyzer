import {
  CATALOG_IMPORT_TEXT_MAX,
} from "@/lib/exercise-catalog-import";
import { formatConvexError } from "@/lib/convex-server";
import { pdfToText } from "@/lib/pdf-text";
import { requireStaffConvex } from "@/lib/staff-auth";

export const runtime = "nodejs";
export const maxDuration = 120;

const FILE_MAX_BYTES = 4.5 * 1024 * 1024; // Vercel serverless body limit

/**
 * Extract text from a large Problem Bible upload (.txt / .md / .json / .pdf).
 * Returns plain text for batched parseImport on the client.
 */
export async function POST(request: Request) {
  const convex = await requireStaffConvex(request, "editor");
  if (convex instanceof Response) return convex;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "file required." }, { status: 400 });
    }
    if (file.size <= 0) {
      return Response.json({ error: "File is empty." }, { status: 400 });
    }
    if (file.size > FILE_MAX_BYTES) {
      return Response.json(
        {
          error:
            "PDF is over 4.5 MB. In Google Docs / Word: File → Download → Plain Text (.txt), then upload that .txt (supports the full 84-page bible).",
        },
        { status: 400 },
      );
    }

    const name = file.name || "upload";
    const type = (file.type || "").toLowerCase();
    const lower = name.toLowerCase();
    const bytes = new Uint8Array(await file.arrayBuffer());

    let text = "";
    let kind: "pdf" | "text" | "json" = "text";

    if (
      type === "application/pdf" ||
      lower.endsWith(".pdf")
    ) {
      kind = "pdf";
      text = await pdfToText(bytes, { maxChars: CATALOG_IMPORT_TEXT_MAX });
      if (!text.trim()) {
        return Response.json(
          {
            error:
              "Could not read text from that PDF. Export the Problem Bible as Plain Text (.txt) and upload that instead.",
          },
          { status: 400 },
        );
      }
    } else {
      text = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      if (lower.endsWith(".json") || type.includes("json")) kind = "json";
    }

    text = text.replace(/\r\n/g, "\n").trim().slice(0, CATALOG_IMPORT_TEXT_MAX);
    if (!text) {
      return Response.json({ error: "No text found in file." }, { status: 400 });
    }

    const truncated = text.length >= CATALOG_IMPORT_TEXT_MAX;
    return Response.json({
      ok: true,
      text,
      fileName: name,
      kind,
      charCount: text.length,
      truncated,
      maxChars: CATALOG_IMPORT_TEXT_MAX,
    });
  } catch (err) {
    return Response.json(
      { error: formatConvexError(err) },
      { status: 500 },
    );
  }
}
