import { readFileSync } from "node:fs";
import { retrieveExercisesWithRag } from "@/lib/exercise-rag";
import { listCatalogExercises } from "@/lib/workout-exercises";

function loadLocalEnv() {
  try {
    const text = readFileSync(".env.local", "utf8");
    for (const line of text.split("\n")) {
      const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
      if (!match) continue;
      const key = match[1];
      const value = match[2].replace(/^['"]|['"]$/g, "").trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // ignore
  }
}

loadLocalEnv();

const transcript = `Coach: For next week I want you to work on this.

You need to say in chronology of what to speak. Always have the point of what you want to say. Practice this with 3-4 tasks from day-to-day activity in meetings with clients and people.

That's your homework.`;

async function main() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GOOGLE_GENERATIVE_AI_API_KEY missing.");
  }

  const catalog = await listCatalogExercises({ enabledOnly: true });
  const rag = await retrieveExercisesWithRag({
    catalog,
    transcript,
    currentFocus: "Lead with the point in client meetings",
    introChallenges: ["Takes too long to get to the point", "Speaks in chronological order"],
    apiKey,
    limit: 4,
  });

  console.log(JSON.stringify({
    catalogSize: catalog.length,
    method: rag.method,
    asks: rag.asks,
    matches: rag.exercises.map((ex, index) => ({
      rank: index + 1,
      id: ex.slug || ex.id,
      name: ex.name,
      problem: ex.problemTitle ?? null,
      purpose: ex.purpose,
    })),
  }, null, 2));
}

void main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
