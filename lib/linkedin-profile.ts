import { generateObject } from "ai";
import { createGoogle } from "@ai-sdk/google";
import { z } from "zod";
import {
  isRetryableModelError,
  modelFallbackChain,
  resolveModelId,
} from "@/lib/gemini";

export const linkedInExperienceSchema = z.object({
  title: z.string().default(""),
  company: z.string().default(""),
  dates: z.string().default(""),
  description: z.string().default(""),
});

export const linkedInEducationSchema = z.object({
  school: z.string().default(""),
  degree: z.string().default(""),
  dates: z.string().default(""),
});

export const linkedInProfileSchema = z.object({
  fullName: z.string().default(""),
  headline: z.string().default(""),
  location: z.string().default(""),
  about: z.string().default(""),
  experience: z.array(linkedInExperienceSchema).default([]),
  education: z.array(linkedInEducationSchema).default([]),
  skills: z.array(z.string()).default([]),
});

export type LinkedInProfile = z.infer<typeof linkedInProfileSchema>;

const EMPTY_PROFILE: LinkedInProfile = {
  fullName: "",
  headline: "",
  location: "",
  about: "",
  experience: [],
  education: [],
  skills: [],
};

export function parseLinkedInProfile(raw: string | undefined | null): LinkedInProfile | null {
  if (!raw?.trim()) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  const parsed = linkedInProfileSchema.safeParse(data);
  if (parsed.success) return parsed.data;
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  const jobs = Array.isArray(o.experience) ? o.experience : [];
  const schools = Array.isArray(o.education) ? o.education : [];
  const skills = Array.isArray(o.skills)
    ? o.skills.map((s) => String(s ?? "").trim()).filter(Boolean)
    : [];
  return {
    fullName: String(o.fullName ?? "").trim(),
    headline: String(o.headline ?? "").trim(),
    location: String(o.location ?? "").trim(),
    about: String(o.about ?? "").trim(),
    experience: jobs
      .filter((job): job is Record<string, unknown> => !!job && typeof job === "object")
      .map((job) => ({
        title: String(job.title ?? "").trim(),
        company: String(job.company ?? "").trim(),
        dates: String(job.dates ?? "").trim(),
        description: String(job.description ?? "").trim(),
      })),
    education: schools
      .filter((row): row is Record<string, unknown> => !!row && typeof row === "object")
      .map((row) => ({
        school: String(row.school ?? "").trim(),
        degree: String(row.degree ?? "").trim(),
        dates: String(row.dates ?? "").trim(),
      })),
    skills,
  };
}

export function stubLinkedInProfile(input: {
  name: string;
  role: string;
  company: string;
  goal: string;
  text: string;
}): LinkedInProfile {
  const about = [input.goal.trim(), input.text.trim().slice(0, 1200)]
    .filter(Boolean)
    .join("\n\n");
  return {
    ...EMPTY_PROFILE,
    fullName: input.name.trim(),
    headline: [input.role.trim(), input.company.trim()].filter(Boolean).join(" · "),
    about,
  };
}

const EXTRACT_PROMPT = `Extract a LinkedIn-style profile from this PDF (LinkedIn "Save to PDF").
Use the extracted text if the file is messy. Leave a field empty rather than inventing it.
Experience: most recent first. Skills: short list, max 20.`;

export async function profileFromLinkedInPdf(input: {
  bytes: Uint8Array;
  text: string;
  name: string;
  role: string;
  company: string;
  goal: string;
}): Promise<LinkedInProfile> {
  const fallback = stubLinkedInProfile(input);
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) return fallback;

  const google = createGoogle({ apiKey });
  const preferred = resolveModelId(process.env.GOOGLE_GENERATIVE_AI_MODEL);
  let lastError: unknown;

  for (const modelId of modelFallbackChain(preferred)) {
    try {
      const result = await generateObject({
        model: google(modelId),
        schema: linkedInProfileSchema,
        schemaName: "LinkedInProfile",
        maxRetries: 0,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `${EXTRACT_PROMPT}

Client name: ${input.name}
Role they entered: ${input.role}
Company they entered: ${input.company}
Program goal they entered: ${input.goal}

Extracted PDF text:
${input.text.slice(0, 24_000) || "(little or no extractable text)"}`,
              },
              {
                type: "file",
                data: input.bytes,
                mediaType: "application/pdf",
              },
            ],
          },
        ],
      });
      const parsed = linkedInProfileSchema.safeParse(result.object);
      if (!parsed.success) return fallback;
      return {
        ...parsed.data,
        fullName: parsed.data.fullName.trim() || fallback.fullName,
        headline: parsed.data.headline.trim() || fallback.headline,
      };
    } catch (err) {
      lastError = err;
      if (!isRetryableModelError(err)) break;
    }
  }

  if (apiKey) {
    try {
      const result = await generateObject({
        model: google(preferred),
        schema: linkedInProfileSchema,
        schemaName: "LinkedInProfile",
        maxRetries: 0,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: `${EXTRACT_PROMPT}

Client name: ${input.name}
Role they entered: ${input.role}
Company they entered: ${input.company}

Extracted PDF text:
${input.text.slice(0, 24_000) || "(no extractable text)"}`,
          },
        ],
      });
      const parsed = linkedInProfileSchema.safeParse(result.object);
      if (parsed.success) {
        return {
          ...parsed.data,
          fullName: parsed.data.fullName.trim() || fallback.fullName,
          headline: parsed.data.headline.trim() || fallback.headline,
        };
      }
    } catch (err) {
      console.error("[linkedin] text-only extract failed", err);
    }
  }

  console.error("[linkedin] profile extract exhausted", lastError);
  return fallback;
}
