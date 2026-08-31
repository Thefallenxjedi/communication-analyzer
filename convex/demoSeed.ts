import { v } from "convex/values";
import { action, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { INTRO_SESSION } from "./coachingProgram";

const SAMPLE_EMAIL = "sample@gmail.com";
const SAMPLE_NAME = "Sample";
const SAMPLE_FOCUS = "Sound like a VP on investor calls";
const YOUTUBE_DEMO = "https://www.youtube.com/watch?v=jNQXAC9IVRw";

const LINKEDIN_PROFILE = {
  fullName: "Sample",
  headline: "Product lead · Series B fintech",
  location: "Bengaluru, India",
  about:
    "I run product for a payments team. I am clear on paper and lose the room on calls — too many hedges, too slow to the point. I joined EliteSpeak to sound like the person who already has the answer.",
  experience: [
    {
      title: "Head of Product",
      company: "Northbeam Payments",
      dates: "2022 – Present",
      description:
        "Own the merchant dashboard and onboarding. Weekly exec reviews, board decks, and a lot of unscripted calls.",
    },
    {
      title: "Product Manager",
      company: "Cascade Analytics",
      dates: "2018 – 2022",
      description: "Grew the self-serve analytics loop. Presented to customers more than I wanted to.",
    },
  ],
  education: [
    {
      school: "IIT Madras",
      degree: "B.Tech, Computer Science",
      dates: "2014 – 2018",
    },
  ],
  skills: [
    "Product strategy",
    "Stakeholder management",
    "Storytelling",
    "Executive presence",
  ],
};

const LINKEDIN_TEXT = `Sample
Product lead · Series B fintech
Bengaluru, India

About
I run product for a payments team. I am clear on paper and lose the room on calls — too many hedges, too slow to the point. I joined EliteSpeak to sound like the person who already has the answer.

Experience
Head of Product · Northbeam Payments
2022 – Present
Own the merchant dashboard and onboarding. Weekly exec reviews, board decks, and a lot of unscripted calls.

Product Manager · Cascade Analytics
2018 – 2022
Grew the self-serve analytics loop. Presented to customers more than I wanted to.

Education
IIT Madras · B.Tech, Computer Science · 2014 – 2018

Skills
Product strategy · Stakeholder management · Storytelling · Executive presence`;

function dummyPdf(): Uint8Array {
  const body = `%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]>>endobj
trailer<</Root 1 0 R>>
%%EOF
`;
  return new TextEncoder().encode(body);
}

function toneWav(seconds = 2, freq = 440, sampleRate = 8000): Uint8Array {
  const n = sampleRate * seconds;
  const dataSize = n * 2;
  const bytes = new Uint8Array(44 + dataSize);
  const view = new DataView(bytes.buffer);
  const write = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i);
  };
  write(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const fade = t < 0.04 ? t / 0.04 : t > 0.96 ? (1 - t) / 0.04 : 1;
    const sample = Math.sin((2 * Math.PI * freq * i) / sampleRate) * 0.28 * fade;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }
  return bytes;
}

function asBlob(bytes: Uint8Array, type: string): Blob {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return new Blob([copy], { type });
}

export const seedSampleClient = action({
  args: {},
  handler: async (ctx) => {
    const pdfId = await ctx.storage.store(asBlob(dummyPdf(), "application/pdf"));
    const clipA = await ctx.storage.store(asBlob(toneWav(), "audio/wav"));
    const clipB = await ctx.storage.store(asBlob(toneWav(2, 330), "audio/wav"));
    return await ctx.runMutation(internal.demoSeed.applySampleClient, {
      pdfId,
      clipA,
      clipB,
    });
  },
});

export const applySampleClient = internalMutation({
  args: {
    pdfId: v.id("_storage"),
    clipA: v.id("_storage"),
    clipB: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const startDate = now - 21 * 86_400_000;

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", SAMPLE_EMAIL))
      .unique();

    let userId: Id<"users">;
    let clientId: Id<"clients">;

    if (existingUser) {
      userId = existingUser._id;
      await ctx.db.patch(userId, {
        name: SAMPLE_NAME,
        role: "client",
        updatedAt: now,
      });
      const client = await ctx.db
        .query("clients")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();
      if (!client) {
        clientId = await ctx.db.insert("clients", {
          userId,
          startDate,
          currentFocus: SAMPLE_FOCUS,
          status: "active",
          lastActivityAt: now,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        clientId = client._id;
        if (client.linkedinStorageId) {
          await ctx.storage.delete(client.linkedinStorageId);
        }
        const tasks = await ctx.db
          .query("tasks")
          .withIndex("by_clientId_createdAt", (q) => q.eq("clientId", clientId))
          .collect();
        for (const task of tasks) {
          if (task.storageId) await ctx.storage.delete(task.storageId);
          await ctx.db.delete(task._id);
        }
      }
    } else {
      userId = await ctx.db.insert("users", {
        name: SAMPLE_NAME,
        email: SAMPLE_EMAIL,
        role: "client",
        createdAt: now,
        updatedAt: now,
      });
      clientId = await ctx.db.insert("clients", {
        userId,
        startDate,
        currentFocus: SAMPLE_FOCUS,
        status: "active",
        lastActivityAt: now,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.patch(clientId, {
      startDate,
      currentFocus: SAMPLE_FOCUS,
      status: "active",
      onboardingComplete: true,
      linkedinStorageId: args.pdfId,
      linkedinText: LINKEDIN_TEXT,
      linkedinProfileJson: JSON.stringify(LINKEDIN_PROFILE),
      lastActivityAt: now,
      updatedAt: now,
    });

    const introReport = await ctx.db
      .query("introCallReports")
      .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
      .unique();
    const introFields = {
      summary:
        "Sample thinks faster than he speaks. On the intro call he circled the point twice before landing it. The work is pace and a cleaner open — not vocabulary.",
      challenges: [
        {
          title: "Slow open",
          body: "The first 15 seconds are throat-clearing. Investors wait. We cut the runway.",
        },
        {
          title: "Hedging",
          body: "I think / maybe / sort of show up when the room gets senior. We replace them with a short claim.",
        },
      ],
      coachingSchedule:
        "Tuesday workout. Thursday review. One live call every other week.",
      osItems: [
        {
          name: "Point first",
          goal: "Lead with the sentence that would go on the slide title.",
          body: "Say the answer, then the proof. Not the other way around.",
        },
        {
          name: "Hold the pause",
          goal: "One beat after the claim. Do not fill it.",
          body: "Silence is how the room catches up. Sample currently talks through it.",
        },
      ],
      reps: [
        {
          title: "20-second open",
          body: "One claim, one number, one ask. Record it standing up.",
        },
        {
          title: "No-hedge retell",
          body: "Tell yesterday’s standup without I think, maybe, or kind of.",
        },
      ],
      updatedAt: now,
    };
    if (introReport) {
      await ctx.db.patch(introReport._id, introFields);
    } else {
      await ctx.db.insert("introCallReports", {
        clientId,
        ...introFields,
      });
    }

    const daysAgo = (d: number) => now - d * 86_400_000;

    await ctx.db.insert("tasks", {
      clientId,
      sessionNumber: INTRO_SESSION,
      title: "BEFORE Video",
      instructions:
        "Record a baseline speaking sample on your phone or camera — your before state. Speak as you would on a real call or presentation, about 60–90 seconds. Upload the video to Google Drive (anyone with the link) or YouTube, then paste that link below.",
      recordingRequired: true,
      reviewRequired: true,
      status: "reviewed",
      driveUrl: YOUTUBE_DEMO,
      durationSec: 19,
      submittedAt: daysAgo(18),
      rating: 6,
      ratingComment:
        "Clear thinking. The first 10 seconds wander — land the point sooner. This is the before we will beat.",
      createdAt: daysAgo(20),
      updatedAt: daysAgo(17),
    });

    await ctx.db.insert("tasks", {
      clientId,
      sessionNumber: 1,
      title: "Pace the first 20 seconds",
      instructions:
        "Record a 20-second open for an investor update. One claim, one number, stop. No throat-clearing.",
      recordingRequired: true,
      reviewRequired: true,
      status: "reviewed",
      storageId: args.clipA,
      durationSec: 2,
      submittedAt: daysAgo(4),
      rating: 7,
      ratingComment:
        "Better pace. Keep the last line. Cut the breath before you start — the clip should open on the claim.",
      createdAt: daysAgo(6),
      updatedAt: daysAgo(3),
    });

    await ctx.db.insert("tasks", {
      clientId,
      sessionNumber: 1,
      title: "Tell yesterday in 60 seconds",
      instructions:
        "Retell yesterday’s most important meeting in 60 seconds. No I think, maybe, or kind of.",
      recordingRequired: true,
      reviewRequired: true,
      status: "submitted",
      storageId: args.clipB,
      durationSec: 2,
      submittedAt: daysAgo(1),
      responseText: "Tried this after the leadership sync. Still slipped in one maybe.",
      createdAt: daysAgo(6),
      updatedAt: daysAgo(1),
    });

    await ctx.db.insert("tasks", {
      clientId,
      sessionNumber: 1,
      title: "Mark your fillers",
      instructions:
        "Write the three filler phrases you used on calls this week. One line each.",
      recordingRequired: false,
      reviewRequired: false,
      status: "done",
      responseText:
        "1. I think we should\n2. kind of\n3. does that make sense?\nCaught myself on the Tuesday exec review.",
      submittedAt: daysAgo(5),
      completedAt: daysAgo(5),
      createdAt: daysAgo(6),
      updatedAt: daysAgo(5),
    });

    await ctx.db.insert("tasks", {
      clientId,
      sessionNumber: 2,
      title: "Warm-up: 60 seconds",
      instructions:
        "Assigned ahead. Opens after Session 1 is complete. Same 20-second open, this time sitting in the chair you take for board calls.",
      recordingRequired: true,
      reviewRequired: true,
      status: "open",
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    });

    return {
      ok: true as const,
      email: SAMPLE_EMAIL,
      name: SAMPLE_NAME,
      clientId,
    };
  },
});
