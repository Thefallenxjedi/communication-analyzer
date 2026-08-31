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

function campfireInstructions(weekNote: string): string {
  return `Sample, you shared a lot with me this last call which I greatly appreciate. The verbal workout routine below will be developed over the next few weeks as I learn more about your unique communication style. Our goal is to make this practice routine between 3-5 mins. Begin by setting a timer for 5 minutes and working through each step below. Use questions you were asked recently at work.

${weekNote}

(2 mins) Light the Campfire/Beacon
Purpose: Prevent rambling. Set your beacon before you speak. Say the compression “campfire” sentence up front.

Instructions:
1. Ask yourself: “If I had to communicate this in one sentence, what would I say?” Answer one of these questions or use a question that’s surfaced from your last week. If you have any that come up, save these for next session to practice with!

2. Say the “campfire” in one sentence. You’ll notice your pace slowing. No commas. Say it in a single breath. Examples:
→ “Leadership is about clarity not certainty.”
→ “Risk is the rent you pay for growth.”
→ “Self-doubt is a signal.”

3. This is your campfire. The campfire is a single sentence that aims to capture 50% of your first idea. This is your verbal home base. Now speak freely for 60 seconds. Wander, explain, explore. But always know where home is. When you lose your way, return to the campfire (repeat a word or words from your campfire).

Record that 60 seconds.`;
}

function preSpeakInstructions(isNew: boolean): string {
  const heading = isNew
    ? "NEW! (90 secs) Pre-Speaking Routine"
    : "(90 secs) Pre-Speaking Routine";
  return `${heading}

Purpose: Before an important meeting, take 90 seconds to prepare:

Obviously Achievable Outcome (OAO) — 30 sec
Choose one simple, measurable thing you will accomplish. Example: “I will share the comparison quote.”

Breathing — 60 sec
Choose one:
Box Breathing: Inhale (nose) 4 sec → hold 4 → exhale (mouth) 4 → hold 4.
OR Lion’s Breathing: 2 sharp (nose) inhales → 1 long (mouth) exhale.

The goal is to enter the meeting clear, intentional, and regulated. Right now, you find a lot of security in the content and preparation. We need to work towards getting you as a person more aligned with how you will show up regardless of what you “know”.

Write the OAO you will use this week, and which breath you chose.`;
}

const SESSION_PLAN: SessionPlan[] = [
  {
    recordTitle: "Daily Routine (4 mins) — Light the Campfire/Beacon",
    recordInstructions: campfireInstructions(
      "Week 1. Stay with one work question only. Do not stack topics.",
    ),
    lessonTitle: "Pre-Speaking Routine (90 secs)",
    lessonInstructions: preSpeakInstructions(false),
    lessonNote:
      "OAO: I will share the APAC restart ask.\nBreath: Box 4-4-4-4.\nStill wanted to open the deck first. Did the breath standing.",
    rating: 7,
    comment:
      "Campfire landed. You left home in the last 20 seconds — repeat one word from the sentence and come back.",
  },
  {
    recordTitle: "Daily Routine (4 mins) — Light the Campfire/Beacon",
    recordInstructions: campfireInstructions(
      "Week 2. Same campfire. This week we add the 90-second pre-speak before you record.",
    ),
    lessonTitle: "NEW! Pre-Speaking Routine (90 secs)",
    lessonInstructions: preSpeakInstructions(true),
    lessonNote:
      "OAO: I will say the comparison quote out loud before the metric.\nBreath: Lion’s — two sharp in, one long out.",
    rating: 6,
    comment:
      "Pre-speak is the work. You still rush the first sentence after the breath. Let the pause exist.",
  },
  {
    recordTitle: "Daily Routine (4 mins) — Light the Campfire/Beacon",
    recordInstructions: campfireInstructions(
      "Week 3. Campfire from a customer question you were asked this week. Texture, not a new structure.",
    ),
    lessonTitle: "Pre-Speaking Routine (90 secs)",
    lessonInstructions: preSpeakInstructions(false),
    lessonNote:
      "OAO: I will name the merchant drop in one sentence.\nBreath: Box.\nCampfire I used: Risk is the rent you pay for growth.",
    rating: 8,
    comment:
      "That campfire is a title. Keep it. Do not explain it after you say it — go to the 60 seconds.",
  },
  {
    recordTitle: "Daily Routine (4 mins) — Light the Campfire/Beacon",
    recordInstructions: campfireInstructions(
      "Week 4. End the 60 seconds on a short line. No summary paragraph after the campfire.",
    ),
    lessonTitle: "Pre-Speaking Routine (90 secs)",
    lessonInstructions: preSpeakInstructions(false),
    lessonNote:
      "OAO: I will share one customer line, not three.\nBreath: Box.\nLine I retired: at the end of the day.",
    rating: 7,
    comment:
      "Ending is clean. The middle still lists. Cut two facts. Return to the campfire once, not three times.",
  },
  {
    recordTitle: "Daily Routine (4 mins) — Light the Campfire/Beacon",
    recordInstructions: campfireInstructions(
      "Week 5. Same 4-minute routine, standing. One take. Timer on.",
    ),
    lessonTitle: "Pre-Speaking Routine (90 secs)",
    lessonInstructions: preSpeakInstructions(false),
    lessonNote:
      "OAO: Number in sentence one.\nBreath: Lion’s.\nI still put net retention in sentence three. Caught it on playback.",
    rating: 7,
    comment:
      "Repeatable now. The number belongs in the campfire, not in the wander.",
  },
  {
    recordTitle: "Daily Routine (4 mins) — Light the Campfire/Beacon",
    recordInstructions: campfireInstructions(
      "Week 6. Same open, sitting in the chair you use for board calls. Do not look at notes.",
    ),
    lessonTitle: "Pre-Speaking Routine (90 secs)",
    lessonInstructions: preSpeakInstructions(false),
    lessonNote:
      "OAO: I will not say I think or maybe.\nBreath: Box in the chair.\nReplacements: We should. Here is the ask.",
    rating: 8,
    comment:
      "Chair version is calmer. Keep this campfire as the house open.",
  },
  {
    recordTitle: "Daily Routine (4 mins) — Light the Campfire/Beacon",
    recordInstructions: campfireInstructions(
      "Week 7. Hostile question. Someone says the metric is wrong. Campfire first, then 60 seconds. No apology loop.",
    ),
    lessonTitle: "Pre-Speaking Routine (90 secs)",
    lessonInstructions: preSpeakInstructions(false),
    lessonNote:
      "OAO: Name the cause in the first sentence.\nBreath: Box.\nQ I feared: Why did sales slip in APAC?\nCampfire: APAC slipped because we paused the partner motion in March.",
    rating: 6,
    comment:
      "You still soften the first line. Start on the cause. The room already knows it slipped.",
  },
  {
    recordTitle: "Daily Routine (4 mins) — Light the Campfire/Beacon",
    recordInstructions: campfireInstructions(
      "Week 8. Capstone. Full update inside the same 4 minutes. Point first, two proofs, one ask. Stop talking.",
    ),
    lessonTitle: "Pre-Speaking Routine (90 secs)",
    lessonInstructions: preSpeakInstructions(false),
    lessonNote:
      "OAO: One ask. Stop.\nBreath: Lion’s.\nPhrases retired: kind of · I think maybe · at the end of the day.",
    rating: 8,
    comment:
      "This is the after. Compare it to the BEFORE video. The campfire is a different person.",
  },
  {
    recordTitle: "Daily Routine (4 mins) — Light the Campfire/Beacon",
    recordInstructions: campfireInstructions(
      "Week 9. Live ask. Twenty seconds of campfire, then the 60. Then stop. This is the sentence you take into the next exec call.",
    ),
    lessonTitle: "Pre-Speaking Routine (90 secs)",
    lessonInstructions: preSpeakInstructions(false),
    lessonNote:
      "OAO: We need a yes on the APAC restart today, not a follow-up.\nBreath: Box.\nFirst sentence when Zoom opens: that OAO, nothing else.",
    rating: 7,
    comment:
      "Ask is clear. Do not explain why you are asking. You already did in the campfire.",
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
        "Sample thinks faster than he speaks. On the intro call he circled the point twice before landing it. The work is pace and a cleaner open — not vocabulary.\n\nHe has real presence when he is in flow. The gap is making that state available on command, not only on good days.",
      challenges: [
        {
          title: "Slow open",
          body: "The first 15 seconds are throat-clearing. Investors wait.\n\n---\nLand the point in one sentence, then prove it.",
        },
        {
          title: "Hedging",
          body: "I think / maybe / sort of show up when the room gets senior.\n\n---\nReplace them with a short claim and hold the pause after it.",
        },
      ],
      coachingSchedule:
        "Tuesday workout. Thursday review. One live call every other week.\n\n---\nPerspective first, practice second — we show you the sharper version, then train you to reach it every time.",
      osItems: [
        {
          name: "Point first",
          goal: "Lead with the sentence that would go on the slide title.",
          body: "Say the answer, then the proof. Not the other way around.\n\n---\nYou do not need more slides. You need one sentence that earns the rest.",
        },
        {
          name: "Hold the pause",
          goal: "One beat after the claim. Do not fill it.",
          body: "Silence is how the room catches up. Sample currently talks through it.\n\n---\nThe pause is part of the message.",
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
