import { v } from "convex/values";
import { anyApi } from "convex/server";
import { action, internalMutation } from "./_generated/server";
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

type SessionPlan = {
  recordTitle: string;
  recordInstructions: string;
  lessonTitle: string;
  lessonInstructions: string;
  lessonNote: string;
  rating: number;
  comment: string;
};

const SESSION_PLAN: SessionPlan[] = [
  {
    recordTitle: "Pace the first 20 seconds",
    recordInstructions:
      "Record a 20-second open for an investor update. One claim, one number, stop. No throat-clearing.",
    lessonTitle: "Mark your fillers",
    lessonInstructions: "Write the three filler phrases you used on calls this week. One line each.",
    lessonNote:
      "1. I think we should\n2. kind of\n3. does that make sense?\nCaught myself on the Tuesday exec review.",
    rating: 7,
    comment:
      "Better pace. Keep the last line. Cut the breath before you start — the clip should open on the claim.",
  },
  {
    recordTitle: "Comfort with silence",
    recordInstructions:
      "Record 45 seconds. Make one claim, then hold a full pause before the proof. Do not fill the gap.",
    lessonTitle: "Pre-speaking ritual",
    lessonInstructions: "Write the 3-step ritual you will use before a senior call.",
    lessonNote:
      "1. Stand up\n2. One slow exhale\n3. Say the title sentence out loud once, then join.",
    rating: 6,
    comment: "The pause is there. You still rush the sentence after it. Let the room land.",
  },
  {
    recordTitle: "One sharp sentence",
    recordInstructions:
      "Record one thought in a single sentence, then a second sentence that proves it. Sixty seconds max.",
    lessonTitle: "Word mine",
    lessonInstructions: "List five words you actually use at work that sound like you — not brochure English.",
    lessonNote: "runway · merchant · float · settle · board pack",
    rating: 8,
    comment: "The first sentence is a title. That is the skill. Do it on the live call this week.",
  },
  {
    recordTitle: "Surprise and sharpen",
    recordInstructions:
      "Retell a customer story. End on a short, sharp line. No summary paragraph after it.",
    lessonTitle: "Quote you would actually say",
    lessonInstructions: "Write one line you could drop in a board update without sounding written.",
    lessonNote: "We did not miss the quarter. We missed the sentence that would have saved it.",
    rating: 7,
    comment: "Ending is clean. The middle still lists. Cut two facts. Keep the line.",
  },
  {
    recordTitle: "Daily open, take 1",
    recordInstructions:
      "Same 20-second investor open as Session 1. Standing. One take.",
    lessonTitle: "What you heard back",
    lessonInstructions: "After you played the clip, write what a skeptical VP would still not believe.",
    lessonNote: "They would ask why net retention moved. I did not put the number in the open.",
    rating: 7,
    comment: "Repeatable now. Number belongs in sentence one, not three.",
  },
  {
    recordTitle: "Daily open, take 2",
    recordInstructions:
      "Same open, sitting in the chair you use for board calls. Do not look at notes.",
    lessonTitle: "Two hedges you still use",
    lessonInstructions: "Name them. Write the replacement sentence.",
    lessonNote:
      "I think we should → We should.\nDoes that make sense? → Here is the ask.",
    rating: 8,
    comment: "Chair version is calmer. Keep this one as the house open.",
  },
  {
    recordTitle: "Hostile question",
    recordInstructions:
      "Someone says the metric is wrong. Record a 40-second reply: claim, one number, one next step. No apology loop.",
    lessonTitle: "The question you fear",
    lessonInstructions: "Write the question. Write your first sentence only.",
    lessonNote:
      "Q: Why did sales slip in APAC?\nA: APAC slipped because we paused the partner motion in March. We restart it Monday.",
    rating: 6,
    comment: "You still soften the first line. Start on the cause. The room already knows it slipped.",
  },
  {
    recordTitle: "Capstone: 90-second update",
    recordInstructions:
      "Full fake board update. 90 seconds. Point first, two proofs, one ask. Stop talking.",
    lessonTitle: "What you will not say",
    lessonInstructions: "Three phrases you are retiring after this program.",
    lessonNote: "kind of · I think maybe · at the end of the day",
    rating: 8,
    comment: "This is the after. Compare it to the BEFORE video. The open is a different person.",
  },
  {
    recordTitle: "Live ask",
    recordInstructions:
      "Record the ask you will make on the next real exec call. Twenty seconds. Then stop.",
    lessonTitle: "Next call, one line",
    lessonInstructions: "Write the first sentence you will say when the Zoom window opens.",
    lessonNote: "We need a yes on the APAC restart today, not a follow-up.",
    rating: 7,
    comment: "Ask is clear. Do not explain why you are asking. You already did.",
  },
];

export const seedSampleClient = action({
  args: {},
  handler: async (ctx) => {
    const pdfId = await ctx.storage.store(asBlob(dummyPdf(), "application/pdf"));
    const clips: Id<"_storage">[] = [];
    for (let i = 0; i < 10; i++) {
      clips.push(
        await ctx.storage.store(asBlob(toneWav(2, 280 + i * 40), "audio/wav")),
      );
    }
    return await ctx.runMutation(anyApi.demoSeed.applySampleClient, {
      pdfId,
      clips,
    });
  },
});

export const applySampleClient = internalMutation({
  args: {
    pdfId: v.id("_storage"),
    clips: v.array(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    if (args.clips.length < 10) throw new Error("Need 10 audio clips");
    const now = Date.now();
    const startDate = now - 70 * 86_400_000;

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
      submittedAt: daysAgo(68),
      rating: 6,
      ratingComment:
        "Clear thinking. The first 10 seconds wander — land the point sooner. This is the before we will beat.",
      createdAt: daysAgo(69),
      updatedAt: daysAgo(67),
    });

    for (let i = 0; i < SESSION_PLAN.length; i++) {
      const sessionNumber = i + 1;
      const plan = SESSION_PLAN[i];
      const clip = args.clips[i];
      if (!plan || !clip) continue;
      const weekAgo = 60 - i * 6;
      const inReview = sessionNumber === 9;
      await ctx.db.insert("tasks", {
        clientId,
        sessionNumber,
        title: plan.recordTitle,
        instructions: plan.recordInstructions,
        recordingRequired: true,
        reviewRequired: true,
        status: inReview ? "submitted" : "reviewed",
        storageId: clip,
        durationSec: 2,
        submittedAt: daysAgo(weekAgo - 1),
        ...(inReview
          ? {}
          : { rating: plan.rating, ratingComment: plan.comment }),
        createdAt: daysAgo(weekAgo + 1),
        updatedAt: daysAgo(weekAgo - 1),
      });
      await ctx.db.insert("tasks", {
        clientId,
        sessionNumber,
        title: plan.lessonTitle,
        instructions: plan.lessonInstructions,
        recordingRequired: false,
        reviewRequired: false,
        status: "done",
        responseText: plan.lessonNote,
        submittedAt: daysAgo(weekAgo),
        completedAt: daysAgo(weekAgo),
        createdAt: daysAgo(weekAgo + 1),
        updatedAt: daysAgo(weekAgo),
      });
    }

    const lastClip = args.clips[9];
    if (!lastClip) throw new Error("missing clip");
    await ctx.db.insert("tasks", {
      clientId,
      sessionNumber: 9,
      title: "Tell yesterday in 60 seconds",
      instructions:
        "Retell yesterday’s most important meeting in 60 seconds. No I think, maybe, or kind of.",
      recordingRequired: true,
      reviewRequired: true,
      status: "reviewed",
      storageId: lastClip,
      durationSec: 2,
      submittedAt: daysAgo(2),
      rating: 7,
      ratingComment:
        "Tried this after the leadership sync. One maybe slipped. The rest is clean.",
      createdAt: daysAgo(3),
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
