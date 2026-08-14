import { scoreLabel } from "@/lib/scoring";

export const COMMUNICATOR_LEVELS = [
  "Needs Significant Improvement",
  "Inconsistent Communicator",
  "Developing Communicator",
  "Effective Communicator",
  "Strong Communicator",
  "Elite Communicator",
] as const;

export type CommunicatorLevel = (typeof COMMUNICATOR_LEVELS)[number];

/** Full 2–3 page PDF workbook content for one communicator level. */
export type PracticePlan = {
  level: CommunicatorLevel;
  /** Short legacy fields kept for simple callers */
  focusThisWeek: string;
  drills: [string, string, string];
  howYouKnow: string;
  /** Page 1 */
  whatThisLevelMeans: string;
  nextFourteenDays: string;
  week1Focus: string;
  week2Focus: string;
  /** Page 2 */
  dailyDrills: [string, string, string];
  thriceWeeklyDrills: [string, string];
  pressureDrill: string;
  /** Page 3 */
  trapsToStop: [string, string];
  framework: string;
  successSignals: [string, string, string];
  nextLevelLooksLike: string;
};

const PLANS: Record<CommunicatorLevel, PracticePlan> = {
  "Needs Significant Improvement": {
    level: "Needs Significant Improvement",
    focusThisWeek:
      "Say one clear point before you explain. Listeners need the destination first.",
    drills: [
      "Record a 30-second answer. Open with: The main thing is ____. Then stop.",
      "After each point, count 1-2-3 silently before you speak again.",
      "Read one paragraph out loud once a day. Cut every um, like, and sort of.",
    ],
    howYouKnow:
      "Someone can repeat your main point back in one sentence without guessing.",
    whatThisLevelMeans:
      "Your ideas may be good, but listeners work too hard to find them. Right now the win is shorter answers and one clear point per turn.",
    nextFourteenDays:
      "Two weeks of one-point answers. Nothing fancy. Clarity first.",
    week1Focus:
      "Open every answer with The main thing is ____. Then give one short support line. Stop.",
    week2Focus:
      "Cut fillers and false starts. Same structure, cleaner delivery.",
    dailyDrills: [
      "[ ] 5 min: Answer one question in 30 seconds. Open with your main point.",
      "[ ] 5 min: Read a short paragraph out loud. Remove um, like, sort of.",
      "[ ] 5 min: Record once. Listen back. Write the one point you actually made.",
    ],
    thriceWeeklyDrills: [
      "[ ] 15 min: Three takes of the same answer. Keep only the cleanest close.",
      "[ ] 15 min: Practice silent 1-2-3 after each sentence before you continue.",
    ],
    pressureDrill:
      "[ ] Hard question, one take, no restart. If you ramble, stop and restart the whole answer once.",
    trapsToStop: [
      "Starting with context before the point. Lead with the answer.",
      "Filling silence with um or like. Pause instead.",
    ],
    framework:
      "Use this every time: The main thing is ____. Here is one reason. That is it.",
    successSignals: [
      "A friend can repeat your point in one sentence.",
      "Most answers land under 45 seconds.",
      "You feel okay stopping without explaining everything.",
    ],
    nextLevelLooksLike:
      "Inconsistent Communicator: your best moments start showing up more often, with a repeatable structure.",
  },
  "Inconsistent Communicator": {
    level: "Inconsistent Communicator",
    focusThisWeek:
      "Make your strong moments the default. Same structure every time you speak.",
    drills: [
      "Use Point, Proof, Close for every answer this week. Sixty seconds max.",
      "Record three answers. Keep only the take where you finish cleanly.",
      "Replace I think / maybe / kind of with a direct claim. Say it once.",
    ],
    howYouKnow:
      "Your best and average answers start to sound the same length and clarity.",
    whatThisLevelMeans:
      "You already have clear moments. The gap is consistency. Same shape every time beats occasional brilliance.",
    nextFourteenDays:
      "Lock one structure and use it until it feels automatic.",
    week1Focus:
      "Point, Proof, Close on every answer. Cap at 60 seconds.",
    week2Focus:
      "Strip softeners. Say the claim once. No I think, maybe, or kind of.",
    dailyDrills: [
      "[ ] 5 min: One answer using Point, Proof, Close. Time it.",
      "[ ] 5 min: Rewrite yesterday's answer without softeners. Say it out loud.",
      "[ ] 5 min: Record. Check: did the close match the open?",
    ],
    thriceWeeklyDrills: [
      "[ ] 15 min: Same question, three takes. Keep the most even one.",
      "[ ] 15 min: Swap every softener for a direct line. Practice the new version twice.",
    ],
    pressureDrill:
      "[ ] Answer a tough question in one take. If you restart mid-way, count it as a miss and redo once.",
    trapsToStop: [
      "Changing structure mid-answer because you feel unsure.",
      "Adding maybe or I think after a strong claim.",
    ],
    framework:
      "Point, Proof, Close. One claim. One support. One landing line.",
    successSignals: [
      "Average answers sound like your good ones.",
      "You finish without a second wind of extra context.",
      "Fewer softeners in everyday speech.",
    ],
    nextLevelLooksLike:
      "Developing Communicator: clean middles and closes, with pauses instead of fillers.",
  },
  "Developing Communicator": {
    level: "Developing Communicator",
    focusThisWeek:
      "Tighten the middle. You have a start. Now land the close without wandering.",
    drills: [
      "Answer in 45 seconds: setup, one example, one-line close.",
      "When you feel a tangent coming, say That is the point and stop.",
      "Practice two pauses per answer. Breathe instead of filling the gap.",
    ],
    howYouKnow:
      "You finish before people look away, and your last line matches your first.",
    whatThisLevelMeans:
      "You can start well. The work now is the middle and the landing. End clean, and do it on purpose.",
    nextFourteenDays:
      "Two weeks of shorter middles and deliberate closes.",
    week1Focus:
      "45-second answers: setup, one example, one-line close.",
    week2Focus:
      "Two planned pauses per answer. Kill tangents with That is the point.",
    dailyDrills: [
      "[ ] 5 min: One 45-second answer. Force a clear last line.",
      "[ ] 5 min: Mark two pause spots in a script, then speak it.",
      "[ ] 5 min: Record. If you wandered, rewrite the middle in one sentence.",
    ],
    thriceWeeklyDrills: [
      "[ ] 15 min: Three questions. Same shape each time. No bonus paragraphs.",
      "[ ] 15 min: Practice stopping at That is the point when a tangent starts.",
    ],
    pressureDrill:
      "[ ] Speak for 60 seconds on a messy topic. Still end with a one-line close that matches the open.",
    trapsToStop: [
      "Adding a second story after the point already landed.",
      "Filling pauses with noise instead of silence.",
    ],
    framework:
      "Setup. One example. Close. If you want a second example, cut the first.",
    successSignals: [
      "Last line matches first line.",
      "People stop looking away before you finish.",
      "You use silence without panic.",
    ],
    nextLevelLooksLike:
      "Effective Communicator: same clarity, more stickiness and force without more words.",
  },
  "Effective Communicator": {
    level: "Effective Communicator",
    focusThisWeek:
      "Add force without adding length. Make one idea stick harder.",
    drills: [
      "End every answer with a quotable line people can repeat.",
      "Cut 20 percent of the words. Keep the same meaning.",
      "Vary pace: slow on the key claim, faster on the support.",
    ],
    howYouKnow:
      "People quote you back, or ask a follow-up on your exact closing line.",
    whatThisLevelMeans:
      "You are clear. Next is memorable. Shorter, sharper, and easier to repeat.",
    nextFourteenDays:
      "Two weeks of sticky closes and tighter wording.",
    week1Focus:
      "Every answer ends with a line someone could quote.",
    week2Focus:
      "Cut 20 percent of the words. Slow down only on the key claim.",
    dailyDrills: [
      "[ ] 5 min: Write one quotable close, then say the full answer into it.",
      "[ ] 5 min: Take yesterday's answer and cut one fifth of the words.",
      "[ ] 5 min: Slow on the claim, faster on support. Record once.",
    ],
    thriceWeeklyDrills: [
      "[ ] 15 min: Three answers, each with a different sticky close.",
      "[ ] 15 min: Edit a transcript of yourself. Cut padding. Speak the edit.",
    ],
    pressureDrill:
      "[ ] High-stakes style question. Still finish with a quotable line under 12 words.",
    trapsToStop: [
      "Adding length because you want to sound thorough.",
      "Rushing the key claim and lingering on details.",
    ],
    framework:
      "Claim. Proof. Sticky close. The close should be repeatable out of context.",
    successSignals: [
      "Someone quotes your close back to you.",
      "Follow-ups target your last line, not your filler.",
      "Same meaning in fewer words feels natural.",
    ],
    nextLevelLooksLike:
      "Strong Communicator: that stickiness holds when the room gets hard.",
  },
  "Strong Communicator": {
    level: "Strong Communicator",
    focusThisWeek:
      "Raise presence under pressure. Sound as sure in hard rooms as in easy ones.",
    drills: [
      "One-take answers to harder questions. No restart. Fix on the next take.",
      "Hold eye-level energy in the voice for the full answer. No fade at the end.",
      "Bookend: open and close with the same idea, said two different ways.",
    ],
    howYouKnow:
      "Under pressure, your pace stays even and your close still lands clean.",
    whatThisLevelMeans:
      "You already communicate well. The edge is composure when stakes rise. Keep the standard when it gets uncomfortable.",
    nextFourteenDays:
      "Pressure reps. Same quality on hard questions as easy ones.",
    week1Focus:
      "One-take answers. No mid-answer restarts. Fix on the next take only.",
    week2Focus:
      "Energy to the last word. Bookend open and close with the same idea.",
    dailyDrills: [
      "[ ] 5 min: One hard question, one take. Note where energy dropped.",
      "[ ] 5 min: Bookend drill. Same idea, two wordings, open and close.",
      "[ ] 5 min: Speak a full answer at even volume. No fade at the end.",
    ],
    thriceWeeklyDrills: [
      "[ ] 15 min: Three pressure questions. Score yourself only on close quality.",
      "[ ] 15 min: Re-do yesterday's weakest take. Keep the better close.",
    ],
    pressureDrill:
      "[ ] Interrupt yourself mid-answer once, then recover without apologizing. Land the close.",
    trapsToStop: [
      "Softening when you sense disagreement.",
      "Letting the last sentence trail off.",
    ],
    framework:
      "Open with the idea. Prove it. Close with the same idea in sharper words.",
    successSignals: [
      "Pace stays even on hard questions.",
      "Energy holds through the last word.",
      "Recovery after a stumble still sounds composed.",
    ],
    nextLevelLooksLike:
      "Elite Communicator: you protect the standard and raise others with it.",
  },
  "Elite Communicator": {
    level: "Elite Communicator",
    focusThisWeek:
      "Protect the standard. Teach your clarity to others and keep polishing.",
    drills: [
      "Coach one peer answer this week. Name one strength and one fix.",
      "Record a 90-second story with a clear open, turn, and close.",
      "Remove one habitual softener you still use when stakes rise.",
    ],
    howYouKnow:
      "Others mirror your structure, and your high-stakes answers stay crisp.",
    whatThisLevelMeans:
      "You already operate at a high bar. The work is maintenance, precision under stakes, and lifting people around you.",
    nextFourteenDays:
      "Polish under pressure, and turn your clarity into a transferable standard.",
    week1Focus:
      "Coach one person. Name one strength and one precise fix.",
    week2Focus:
      "One 90-second story with open, turn, close. Kill your last softener under stakes.",
    dailyDrills: [
      "[ ] 5 min: Notice one softener in your day. Replace it once out loud.",
      "[ ] 5 min: Outline open, turn, close for a short story. Speak it once.",
      "[ ] 5 min: Give yourself one coaching note on yesterday's recording.",
    ],
    thriceWeeklyDrills: [
      "[ ] 15 min: Coach a peer answer. Strength plus one fix only.",
      "[ ] 15 min: Full 90-second story take. Check bookend and energy.",
    ],
    pressureDrill:
      "[ ] High-stakes prompt. No softeners. Clean open, turn, and close in 90 seconds.",
    trapsToStop: [
      "Over-explaining because you can. Stop when the point landed.",
      "Letting rare softeners sneak back when the room is tense.",
    ],
    framework:
      "Open. Turn. Close. Then teach that shape to someone else in one minute.",
    successSignals: [
      "Peers start using your structure.",
      "High-stakes answers stay crisp without restarts.",
      "You catch softeners before they leave your mouth.",
    ],
    nextLevelLooksLike:
      "Stay here on purpose. Protect the standard every week. Raise the room.",
  },
};

function normalizeLevel(raw: string): CommunicatorLevel | null {
  const needle = raw.trim().toLowerCase();
  if (!needle) return null;
  for (const level of COMMUNICATOR_LEVELS) {
    if (level.toLowerCase() === needle) return level;
  }
  return null;
}

/** Resolve a practice plan from report level, falling back to overall score. */
export function resolvePracticePlan(
  level: string | undefined,
  overallScore: number,
): PracticePlan {
  const matched =
    normalizeLevel(level || "") ||
    normalizeLevel(scoreLabel(overallScore)) ||
    "Developing Communicator";
  return PLANS[matched];
}
