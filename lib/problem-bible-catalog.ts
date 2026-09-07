/**
 * The Communication Problem Bible — full exercise catalog for EliteSpeak.
 *
 * Covers all 35 communication problems, each with 2 coach-facing exercises
 * (70 total). Content is faithful to the EliteSpeak Communication Problem Bible:
 * every entry names the real drill and keeps the coaching intent intact.
 *
 * Use PROBLEM_BIBLE_EXERCISES for retrieval / seeding and problemBibleBySlug()
 * for direct lookups.
 */

export type ProblemBibleExerciseSeed = {
  slug: string; // e.g. "p01-e1-i-believe-that"
  name: string;
  purpose: string;
  problemItSolves: string;
  instructions: string; // full coach-facing workout copy: INSTRUCTIONS + PRACTICE FORMAT + WHAT TO WATCH FOR + SUCCESS STANDARD combined clearly
  whenToUse: string; // from problem title + WHY THIS HAPPENS summary (2-4 sentences)
  tags: string[]; // lowercase kebab or camelCase tags for retrieval
  timing: string; // e.g. "10-15 minutes daily"
  timingMinutes: number; // typical session minutes, e.g. 12
  problemNumber: number; // 1-35
  problemTitle: string;
  exerciseIndex: number; // 1 or 2
  timelineSummary: string; // short version of RECOMMENDED TRAINING TIMELINE
  source: "problem-bible";
  sortOrder: number; // problemNumber * 10 + exerciseIndex
};

type SeedInput = {
  problemNumber: number;
  problemTitle: string;
  exerciseIndex: 1 | 2;
  slug: string;
  name: string;
  purpose: string;
  problemItSolves: string;
  instructionsBody: string;
  practiceFormat: string;
  whatToWatchFor: string;
  successStandard: string;
  whenToUse: string;
  tags: string[];
  timing: string;
  timingMinutes: number;
  timelineSummary: string;
};

function seed(input: SeedInput): ProblemBibleExerciseSeed {
  const instructions = [
    "PROBLEM IT SOLVES",
    input.problemItSolves,
    "",
    "PURPOSE",
    input.purpose,
    "",
    "INSTRUCTIONS",
    input.instructionsBody,
    "",
    "PRACTICE FORMAT",
    input.practiceFormat,
    "",
    "WHAT TO WATCH FOR",
    input.whatToWatchFor,
    "",
    "SUCCESS STANDARD",
    input.successStandard,
  ].join("\n");

  return {
    slug: input.slug,
    name: input.name,
    purpose: input.purpose,
    problemItSolves: input.problemItSolves,
    instructions,
    whenToUse: input.whenToUse,
    tags: input.tags,
    timing: input.timing,
    timingMinutes: input.timingMinutes,
    problemNumber: input.problemNumber,
    problemTitle: input.problemTitle,
    exerciseIndex: input.exerciseIndex,
    timelineSummary: input.timelineSummary,
    source: "problem-bible",
    sortOrder: input.problemNumber * 10 + input.exerciseIndex,
  };
}

export const PROBLEM_BIBLE_EXERCISES: ProblemBibleExerciseSeed[] = [
  // ── Problem 01 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 1,
    problemTitle: "I Take Too Long to Get to the Point",
    exerciseIndex: 1,
    slug: "p01-e1-i-believe-that",
    name: '"I Believe That" Drill',
    purpose:
      "Train the instinct to lead with your conclusion instead of narrating your way toward it.",
    problemItSolves:
      "You bury the point under background and context, so listeners disengage before you land it.",
    instructionsBody:
      'Pick a topic from your recent work. Force yourself to start the answer with the words "I believe that…" and finish that single sentence with your actual conclusion. The framing tricks your brain into stating the destination first, then supporting it — instead of building up to it.',
    practiceFormat:
      'Choose 5 questions you might get asked this week. For each, record a 30-second answer that begins with "I believe that…". Play it back and confirm the first sentence already contains the payoff.',
    whatToWatchFor:
      "Watch for smuggling context in before the conclusion, or hedging the belief with qualifiers. The point must be fully formed in sentence one.",
    successStandard:
      "A stranger could hear only your first sentence and already know your position.",
    whenToUse:
      "Use when you take too long to get to the point. This happens because we think in chronological order and try to bring the listener along the same path we walked, so the conclusion arrives last instead of first.",
    tags: ["rambling", "clarity", "structure", "conclusion-first", "concision"],
    timing: "10-15 minutes daily",
    timingMinutes: 12,
    timelineSummary:
      "Week 1: point-first on prepared answers. Weeks 2-3: apply live in meetings. Week 4: it becomes your default open.",
  }),
  seed({
    problemNumber: 1,
    problemTitle: "I Take Too Long to Get to the Point",
    exerciseIndex: 2,
    slug: "p01-e2-30-second-compression",
    name: "30-Second Compression",
    purpose:
      "Build the discipline to deliver a complete answer inside a hard time cap.",
    problemItSolves:
      "Without a limit you keep adding detail; a cap forces you to keep only what matters.",
    instructionsBody:
      "Take something you'd normally explain in two or three minutes and deliver the whole thing in 30 seconds. The constraint strips away throat-clearing and forces prioritisation: point, one reason, one example, done.",
    practiceFormat:
      "Set a 30-second timer. Answer a real work question fully before it ends. Repeat with 3 different topics. Then try 20 seconds to feel the extra squeeze.",
    whatToWatchFor:
      "Watch for speeding up to cram everything in rather than cutting. Compression means fewer ideas said clearly, not the same ideas said faster.",
    successStandard:
      "A full, satisfying answer lands in 30 seconds with time to spare and nothing important missing.",
    whenToUse:
      "Use when your answers run long and listeners lose the thread. Length feels like thoroughness, but a tight cap proves you can be complete and brief at once.",
    tags: ["rambling", "concision", "compression", "clarity", "timing"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: 30-second reps daily. Week 2: drop to 20 seconds. Weeks 3-4: use the cap silently in real conversations.",
  }),

  // ── Problem 02 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 2,
    problemTitle: "I Lose My Train of Thought Mid-Sentence",
    exerciseIndex: 1,
    slug: "p02-e1-pause-before-you-speak",
    name: "Pause Before You Speak",
    purpose:
      "Replace the reflex to start talking immediately with a deliberate beat that lets the sentence form first.",
    problemItSolves:
      "You launch before the thought is built, so it collapses halfway through.",
    instructionsBody:
      "Before answering anything, take one full silent beat. Let the first sentence assemble in your head, then speak it. The pause feels long to you and invisible to them, and it buys the brain the moment it needs to finish the thought before the mouth starts it.",
    practiceFormat:
      "Have someone ask you questions (or use recorded prompts). After each, count one silent beat, then answer. Do 8-10 reps and notice how the sentences hold together.",
    whatToWatchFor:
      "Watch for filling the pause with 'um' or 'so' — the beat must be genuinely silent. Also watch for rushing once you start.",
    successStandard:
      "You complete full sentences without them dissolving mid-way, and the opening pause feels natural.",
    whenToUse:
      "Use when sentences fall apart in the middle. This happens because we start speaking before the thought is finished forming, so we run out of sentence before we run out of idea.",
    tags: ["pause", "clarity", "train-of-thought", "composure", "structure"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: pause on every practice answer. Weeks 2-3: bring the beat into real conversations. Week 4: it's automatic.",
  }),
  seed({
    problemNumber: 2,
    problemTitle: "I Lose My Train of Thought Mid-Sentence",
    exerciseIndex: 2,
    slug: "p02-e2-anchor-word-method",
    name: "Anchor Word Method",
    purpose:
      "Give yourself a single word to return to whenever the thread slips.",
    problemItSolves:
      "When you lose your place mid-thought you spiral; an anchor word gives you a way back.",
    instructionsBody:
      "Before you speak, choose one word that captures your core point. As you talk, keep that word in mind. If you feel the thought slipping, say the anchor word again — it snaps you back to the centre of your message instead of trailing off.",
    practiceFormat:
      "Pick a topic and its anchor word. Speak for 60 seconds. Each time you feel yourself drifting, repeat the anchor word aloud and continue. Do 4-5 rounds with different topics.",
    whatToWatchFor:
      "Watch for choosing a vague anchor word that doesn't actually pull you back. It should be the beating heart of the point, not a generic label.",
    successStandard:
      "You can recover a lost thought within a second or two by returning to the anchor, without visible panic.",
    whenToUse:
      "Use when you lose your train of thought mid-sentence and can't find your way back. An anchor word turns a spiral into a quick reset.",
    tags: ["anchor", "train-of-thought", "recovery", "clarity", "focus"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: anchor word on prepared topics. Weeks 2-3: set an anchor before real meetings. Week 4: recovery becomes instinctive.",
  }),

  // ── Problem 03 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 3,
    problemTitle: "I Struggle to Explain Complex Ideas Simply",
    exerciseIndex: 1,
    slug: "p03-e1-familiar-story-bridge",
    name: "Familiar Story Bridge",
    purpose:
      "Explain something complex by bridging it to something the listener already understands.",
    problemItSolves:
      "You explain complexity with more complexity; a familiar bridge makes it instantly graspable.",
    instructionsBody:
      "Take a complex idea and connect it to an everyday experience the listener already knows — a queue, a recipe, a traffic jam. Start with the familiar thing, then map the complex idea onto it. The known carries the unknown.",
    practiceFormat:
      "Pick 3 concepts from your field. For each, find one everyday analogy and explain the concept through it in under a minute. Test whether a non-expert could repeat it back.",
    whatToWatchFor:
      "Watch for analogies that are as complex as the original, or that break down under scrutiny. The bridge must be genuinely familiar and structurally accurate.",
    successStandard:
      "Someone outside your field understands the idea after one pass and can explain it back in their own words.",
    whenToUse:
      "Use when complex ideas don't land with non-experts. It happens because expertise makes us forget what it's like not to know — we skip the bridge the listener needs.",
    tags: ["clarity", "analogy", "simplicity", "explanation", "storytelling"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: build analogies for 3 core ideas. Weeks 2-3: use bridges live. Week 4: reach for analogy automatically.",
  }),
  seed({
    problemNumber: 3,
    problemTitle: "I Struggle to Explain Complex Ideas Simply",
    exerciseIndex: 2,
    slug: "p03-e2-one-sentence-core-drill",
    name: "One-Sentence Core Drill",
    purpose:
      "Distil a complex idea down to a single, plain sentence before you elaborate.",
    problemItSolves:
      "You can't explain simply because you haven't decided the one core thing to say.",
    instructionsBody:
      "Before explaining anything complex, force the whole thing into one plain sentence a 12-year-old could follow. That sentence becomes your foundation; everything else is optional detail layered on top of a clear core.",
    practiceFormat:
      "Take 3 complex topics. Write the one-sentence core for each — no jargon, no clauses stacked on clauses. Then say it aloud and only add detail after the core is clear.",
    whatToWatchFor:
      "Watch for sentences that are secretly three sentences joined by 'and'. The core must be one idea, plainly stated.",
    successStandard:
      "Each complex topic has a single clean sentence that captures its essence with no jargon.",
    whenToUse:
      "Use when you struggle to explain complex ideas simply. Simplicity starts with deciding the one thing that matters most before you open your mouth.",
    tags: ["clarity", "simplicity", "core-message", "explanation", "concision"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: write one-sentence cores daily. Weeks 2-3: lead with the core in real explanations. Week 4: it's your default.",
  }),

  // ── Problem 04 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 4,
    problemTitle: "I Sound Less Confident Than I Actually Feel",
    exerciseIndex: 1,
    slug: "p04-e1-vocal-landing-drill",
    name: "Vocal Landing Drill",
    purpose:
      "Land the ends of your sentences with a downward, definitive tone instead of an upward question.",
    problemItSolves:
      "Upward inflection at the end of statements makes certainty sound like a question.",
    instructionsBody:
      "Practise ending statements with a downward pitch — the vocal 'period'. Rising tone signals doubt; a firm landing signals conviction. Say a sentence, then consciously drop the pitch on the final word so it lands rather than lifts.",
    practiceFormat:
      "Read 10 declarative sentences aloud, deliberately landing each ending downward. Record and check: does every statement end like a statement, not a question?",
    whatToWatchFor:
      "Watch for 'uptalk' creeping back in under real conditions, and for trailing off into silence instead of a firm landing.",
    successStandard:
      "Every statement ends with a clear downward landing that reads as certainty.",
    whenToUse:
      "Use when you sound less confident than you feel. Rising end-inflection and soft landings leak doubt into sentences you're actually sure about.",
    tags: ["confidence", "vocal-delivery", "inflection", "conviction", "tone"],
    timing: "8-10 minutes daily",
    timingMinutes: 9,
    timelineSummary:
      "Week 1: land endings on prepared lines. Weeks 2-3: hear and correct uptalk live. Week 4: firm landings are natural.",
  }),
  seed({
    problemNumber: 4,
    problemTitle: "I Sound Less Confident Than I Actually Feel",
    exerciseIndex: 2,
    slug: "p04-e2-qualifier-elimination-week",
    name: "Qualifier Elimination Week",
    purpose:
      "Strip out the hedging words that shrink your certainty in the listener's ears.",
    problemItSolves:
      "'Just', 'kind of', 'I think maybe' quietly undercut statements you're sure about.",
    instructionsBody:
      "Spend a week hunting your qualifiers: just, kind of, sort of, I think, maybe, probably, a little. Notice each one, then say the sentence again without it. The idea stays; the hedge disappears and the confidence appears.",
    practiceFormat:
      "Record yourself answering questions each day. Count the qualifiers, then redeliver the same answers with zero. Track the count dropping across the week.",
    whatToWatchFor:
      "Watch for swapping one hedge for another, or for stripping so hard you sound blunt. Aim for clean, not aggressive.",
    successStandard:
      "Your statements carry no reflexive qualifiers, and you can add a hedge deliberately only when you truly mean it.",
    whenToUse:
      "Use when you sound less confident than you feel. Hedging words are a verbal habit that makes solid ideas sound tentative.",
    tags: ["confidence", "hedging", "qualifiers", "conviction", "clarity"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: count and cut qualifiers. Weeks 2-3: catch them in real time. Week 4: clean speech by default.",
  }),

  // ── Problem 05 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 5,
    problemTitle: "My Delivery Feels Stiff or Unnatural",
    exerciseIndex: 1,
    slug: "p05-e1-camera-comparison-test",
    name: "Camera Comparison Test",
    purpose:
      "See the gap between your relaxed self and your 'performing' self, then close it.",
    problemItSolves:
      "You have a natural voice in casual talk and a stiff one on camera; you need to merge them.",
    instructionsBody:
      "Record two clips of the same topic: one as if chatting with a friend, one as if formally presenting. Compare them. The casual version reveals your natural rhythm and warmth; the goal is to bring that ease into the formal one.",
    practiceFormat:
      "Record a casual take, then a formal take, then a third take aiming for the casual feel in a formal frame. Compare all three and repeat with a new topic.",
    whatToWatchFor:
      "Watch for the formal take tightening your face, flattening your voice, and shrinking your gestures. Note exactly what changes so you can reverse it.",
    successStandard:
      "Your formal delivery carries the same warmth and rhythm as your casual conversation.",
    whenToUse:
      "Use when your delivery feels stiff or unnatural. Stiffness comes from switching into 'performance mode' that suppresses the natural way you already speak.",
    tags: ["delivery", "naturalness", "camera", "authenticity", "presence"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: compare casual vs formal takes. Weeks 2-3: import the casual feel. Week 4: one natural mode.",
  }),
  seed({
    problemNumber: 5,
    problemTitle: "My Delivery Feels Stiff or Unnatural",
    exerciseIndex: 2,
    slug: "p05-e2-intention-first-practice",
    name: "Intention-First Practice",
    purpose:
      "Speak from a clear intention toward the listener rather than performing words.",
    problemItSolves:
      "Stiffness comes from focusing on yourself; intention shifts focus to the effect you want.",
    instructionsBody:
      "Before speaking, name the effect you want on the listener — reassure, convince, energise, warn. Hold that intention while you talk. When your attention is on the person and the outcome, delivery loosens and becomes natural automatically.",
    practiceFormat:
      "Pick a topic and a one-word intention. Deliver it aiming purely at that effect. Repeat the same content with a different intention and feel your delivery change.",
    whatToWatchFor:
      "Watch for slipping back into self-monitoring ('how do I look?'). The fix is to keep attention on the listener, not yourself.",
    successStandard:
      "Your delivery changes naturally with your intention, and you stop thinking about how you appear.",
    whenToUse:
      "Use when your delivery feels stiff or unnatural. Self-focus creates performance mode; intention toward the listener dissolves it.",
    tags: ["delivery", "naturalness", "intention", "presence", "connection"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: set an intention before each rep. Weeks 2-3: use it live. Week 4: intention-led delivery is default.",
  }),

  // ── Problem 06 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 6,
    problemTitle: "I Ramble When the Pressure Is On",
    exerciseIndex: 1,
    slug: "p06-e1-prep-framework",
    name: "PREP Framework",
    purpose:
      "Give pressured answers a fixed structure so you can't ramble your way off a cliff.",
    problemItSolves:
      "Under pressure you have no structure to fall back on, so you keep talking.",
    instructionsBody:
      "Answer in four beats: Point (your conclusion), Reason (why), Example (a concrete instance), Point (restate). The structure is a rail: even under pressure you always know what comes next and where the answer ends.",
    practiceFormat:
      "Take 5 likely tough questions. Answer each in PREP, out loud, in under a minute. Record and confirm all four beats are present and in order.",
    whatToWatchFor:
      "Watch for the Reason ballooning into three reasons, or skipping the final Point so the answer never lands. Keep each beat tight.",
    successStandard:
      "You can deliver a clean four-beat PREP answer under pressure without rambling.",
    whenToUse:
      "Use when you ramble under pressure. Pressure removes access to structure, so a pre-loaded framework keeps you on rails when adrenaline hits.",
    tags: ["rambling", "pressure", "PREP", "structure", "composure"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: drill PREP on prepared questions. Weeks 2-3: use it in real pressure. Week 4: PREP is automatic.",
  }),
  seed({
    problemNumber: 6,
    problemTitle: "I Ramble When the Pressure Is On",
    exerciseIndex: 2,
    slug: "p06-e2-one-idea-rule",
    name: "One-Idea Rule",
    purpose:
      "Commit to delivering exactly one idea per answer under pressure.",
    problemItSolves:
      "Pressure makes you cram multiple ideas into one answer, which reads as rambling.",
    instructionsBody:
      "When the pressure is on, pick the single most important idea and say only that. One idea, supported, then stop. Extra ideas can come as follow-ups if asked — they don't all need to fit in the first answer.",
    practiceFormat:
      "Answer 5 questions with a strict one-idea limit each. If a second idea surfaces, note it but don't say it. Record and verify each answer holds exactly one idea.",
    whatToWatchFor:
      "Watch for sneaking a second idea in via 'and also' or 'plus'. Discipline is the whole point.",
    successStandard:
      "Every pressured answer delivers one clear idea and stops, with no add-ons.",
    whenToUse:
      "Use when you ramble under pressure. Trying to say everything at once is what produces the ramble; one idea per answer breaks it.",
    tags: ["rambling", "pressure", "concision", "focus", "structure"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: one-idea reps daily. Weeks 2-3: enforce it live. Week 4: single-idea answers by default.",
  }),

  // ── Problem 07 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 7,
    problemTitle: "My Ideas Sound Smaller Out Loud Than in My Head",
    exerciseIndex: 1,
    slug: "p07-e1-bookend-method",
    name: "Bookend Method",
    purpose:
      "Frame an idea with a strong open and a strong close so it carries its full weight.",
    problemItSolves:
      "Ideas shrink when they're delivered flat in the middle with no framing.",
    instructionsBody:
      "Open by naming why the idea matters, deliver the idea, then close by restating its significance. The two bookends give the idea a frame; the same content lands bigger because it arrives with stakes and leaves with meaning.",
    practiceFormat:
      "Take 3 ideas you think are underrated. Bookend each: significance → idea → significance. Deliver aloud and compare to a flat version.",
    whatToWatchFor:
      "Watch for weak bookends ('this is kind of important') that undercut the frame. The open and close must actually assert value.",
    successStandard:
      "The bookended version clearly lands with more weight than the flat version.",
    whenToUse:
      "Use when your ideas sound smaller out loud than in your head. Unframed delivery strips ideas of the stakes you feel internally.",
    tags: ["conviction", "framing", "weight", "structure", "presence"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: bookend prepared ideas. Weeks 2-3: frame ideas live. Week 4: bookending is habitual.",
  }),
  seed({
    problemNumber: 7,
    problemTitle: "My Ideas Sound Smaller Out Loud Than in My Head",
    exerciseIndex: 2,
    slug: "p07-e2-conviction-repeat",
    name: "Conviction Repeat",
    purpose:
      "Repeat a key line with rising conviction until it carries the weight you feel.",
    problemItSolves:
      "You deliver strong ideas with weak energy, so they sound smaller than intended.",
    instructionsBody:
      "Take your key sentence and say it three times, each with more conviction than the last — steadier tone, firmer landing, more belief in your voice. The reps calibrate your delivery up to match the size of the idea in your head.",
    practiceFormat:
      "Pick 3 key lines. Say each three times, escalating conviction. Record the third pass and confirm it sounds as big as the idea feels internally.",
    whatToWatchFor:
      "Watch for confusing volume with conviction. Conviction is steadiness and belief, not just loudness.",
    successStandard:
      "Your out-loud delivery of a key idea matches the weight you feel for it internally.",
    whenToUse:
      "Use when your ideas sound smaller out loud than in your head. The gap is delivery energy, and reps close it.",
    tags: ["conviction", "weight", "vocal-delivery", "presence", "belief"],
    timing: "8-10 minutes daily",
    timingMinutes: 9,
    timelineSummary:
      "Week 1: conviction reps on key lines. Weeks 2-3: bring the energy live. Week 4: full-weight delivery default.",
  }),

  // ── Problem 08 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 8,
    problemTitle: "I Don't Know How to Make My Message Land with Weight",
    exerciseIndex: 1,
    slug: "p08-e1-strategic-pause",
    name: "Strategic Pause",
    purpose:
      "Use silence around a key point to give it space to land.",
    problemItSolves:
      "You rush past important points, giving listeners no room to absorb them.",
    instructionsBody:
      "Place a deliberate pause right before and right after your most important sentence. The silence before creates anticipation; the silence after lets it sink in. Weight comes as much from what surrounds the point as from the point itself.",
    practiceFormat:
      "Pick 3 key sentences. Deliver each with a beat of silence before and after. Record and listen for whether the pauses make the point feel heavier.",
    whatToWatchFor:
      "Watch for filling the pause with filler, or rushing on before the silence does its work. Trust the silence.",
    successStandard:
      "Your key points land with noticeable weight because silence frames them.",
    whenToUse:
      "Use when you don't know how to make your message land with weight. Continuous speech gives no point room to breathe; pauses create emphasis.",
    tags: ["pause", "weight", "emphasis", "presence", "authority"],
    timing: "8-10 minutes daily",
    timingMinutes: 9,
    timelineSummary:
      "Week 1: pause around key lines. Weeks 2-3: use strategic pauses live. Week 4: weighted delivery default.",
  }),
  seed({
    problemNumber: 8,
    problemTitle: "I Don't Know How to Make My Message Land with Weight",
    exerciseIndex: 2,
    slug: "p08-e2-sage-voice-drill",
    name: "Sage Voice Drill",
    purpose:
      "Slow, ground, and lower your delivery into the calm register of someone who knows.",
    problemItSolves:
      "A fast, high, light voice signals nerves; a grounded 'sage' voice signals authority.",
    instructionsBody:
      "Practise delivering key points in a slower, lower, grounded voice — the tone of a calm expert who has nothing to prove. Slow the pace, drop the pitch slightly, and let each word settle. The register itself communicates weight.",
    practiceFormat:
      "Read 5 important lines in your normal voice, then in the sage voice. Compare recordings and note how the slower, grounded version carries more authority.",
    whatToWatchFor:
      "Watch for slowing so much it sounds theatrical, or forcing pitch unnaturally low. Aim for calm and grounded, not performed.",
    successStandard:
      "You can shift into a slower, grounded register that reads as calm authority.",
    whenToUse:
      "Use when you don't know how to make your message land with weight. Delivery register communicates authority before content does.",
    tags: ["authority", "weight", "vocal-delivery", "pace", "presence"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: practise the sage register. Weeks 2-3: use it for key moments. Week 4: grounded delivery on demand.",
  }),

  // ── Problem 09 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 9,
    problemTitle: "I Go Blank When Put on the Spot",
    exerciseIndex: 1,
    slug: "p09-e1-prep-framework-sprint",
    name: "PREP Framework Sprint",
    purpose:
      "Have a ready structure so a blank mind can grab a rail instead of freezing.",
    problemItSolves:
      "When put on the spot the mind blanks; a memorised structure gives it something to hold.",
    instructionsBody:
      "Drill PREP (Point, Reason, Example, Point) as a rapid reflex on random surprise questions. When you go blank, you don't need an idea first — you need the first slot: state a Point. The framework pulls the rest out of you.",
    practiceFormat:
      "Have someone fire random questions with no warning. Answer each in PREP within seconds. Do 8-10 rapid rounds so the structure becomes reflexive.",
    whatToWatchFor:
      "Watch for freezing before the Point. The drill trains you to always be able to start with a claim, even a simple one.",
    successStandard:
      "A surprise question triggers PREP automatically instead of a blank.",
    whenToUse:
      "Use when you go blank when put on the spot. Blanking is loss of access under surprise; a reflexive structure restores a starting point.",
    tags: ["freeze", "on-the-spot", "PREP", "structure", "composure"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: sprint PREP on random prompts. Weeks 2-3: use it in live surprises. Week 4: reflexive under pressure.",
  }),
  seed({
    problemNumber: 9,
    problemTitle: "I Go Blank When Put on the Spot",
    exerciseIndex: 2,
    slug: "p09-e2-rapid-exposure-drill",
    name: "Rapid Exposure Drill",
    purpose:
      "Desensitise the blank-out reflex by repeatedly being put on the spot in practice.",
    problemItSolves:
      "The blank is a stress response; controlled exposure lowers the stress over time.",
    instructionsBody:
      "Deliberately put yourself on the spot again and again in low-stakes reps — answer random questions instantly, with no prep. Each exposure teaches your nervous system that being surprised isn't a threat, and the blanking fades.",
    practiceFormat:
      "Do 10 rapid-fire surprise questions back to back, answering immediately. Repeat daily. The goal is volume of exposure, not polish.",
    whatToWatchFor:
      "Watch for over-preparing between reps, which defeats the exposure. The value is in genuine surprise.",
    successStandard:
      "Being put on the spot produces far less panic, and you can start speaking within a beat.",
    whenToUse:
      "Use when you go blank when put on the spot. The reflex weakens only through repeated, real exposure to surprise.",
    tags: ["freeze", "on-the-spot", "exposure", "composure", "confidence"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: daily rapid exposure reps. Weeks 2-3: raise the stakes gradually. Week 4: surprise no longer blanks you.",
  }),

  // ── Problem 10 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 10,
    problemTitle: "I Second-Guess Myself While Speaking",
    exerciseIndex: 1,
    slug: "p10-e1-one-take-rule",
    name: "One-Take Rule",
    purpose:
      "Commit to a single take with no restarts, killing the self-editing loop.",
    problemItSolves:
      "Second-guessing makes you restart and self-correct mid-speech; one take removes the option.",
    instructionsBody:
      "Record answers in a single take — no stopping, no re-recording, no 'let me start over'. Whatever comes out, you finish. Removing the escape hatch forces you to commit to your words instead of editing them in real time.",
    practiceFormat:
      "Answer 5 questions, one take each, no restarts allowed. Keep every take even the messy ones. Notice self-corrections shrinking across reps.",
    whatToWatchFor:
      "Watch for mid-sentence corrections ('I mean…', 'actually…'). Let the first version stand and keep moving.",
    successStandard:
      "You complete answers in one take without restarting or audibly second-guessing.",
    whenToUse:
      "Use when you second-guess yourself while speaking. The self-editing loop feeds on the option to redo; removing it builds commitment.",
    tags: ["second-guessing", "commitment", "confidence", "self-editing", "flow"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: one-take reps daily. Weeks 2-3: apply the mindset live. Week 4: you commit instead of editing.",
  }),
  seed({
    problemNumber: 10,
    problemTitle: "I Second-Guess Myself While Speaking",
    exerciseIndex: 2,
    slug: "p10-e2-first-sentence-commitment",
    name: "First Sentence Commitment",
    purpose:
      "Commit fully to your opening sentence so momentum carries the rest.",
    problemItSolves:
      "Second-guessing starts at the open; a committed first sentence sets a decisive tone.",
    instructionsBody:
      "Decide your first sentence and say it with full commitment, no hedging and no take-backs. A decisive open sets the pattern for the whole answer — once you've committed to sentence one, the rest tends to follow without second-guessing.",
    practiceFormat:
      "For 5 topics, lock in a first sentence and deliver it with total commitment, then continue. Record and check the open sounds fully committed.",
    whatToWatchFor:
      "Watch for softening the first sentence with 'I guess' or immediately qualifying it. Commit and continue.",
    successStandard:
      "Your first sentence lands with full commitment and no take-backs, and momentum follows.",
    whenToUse:
      "Use when you second-guess yourself while speaking. A committed open interrupts the doubt loop before it starts.",
    tags: ["second-guessing", "commitment", "confidence", "opening", "conviction"],
    timing: "8-10 minutes daily",
    timingMinutes: 9,
    timelineSummary:
      "Week 1: commit to first sentences daily. Weeks 2-3: apply live. Week 4: decisive opens by default.",
  }),

  // ── Problem 11 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 11,
    problemTitle: "I Sound Scattered When I Care a Lot",
    exerciseIndex: 1,
    slug: "p11-e1-breath-anchor",
    name: "Breath Anchor",
    purpose:
      "Use the breath to steady the surge of energy that scatters your speech when you care.",
    problemItSolves:
      "Caring deeply floods you with energy that scatters into too many directions at once.",
    instructionsBody:
      "Before speaking about something you care about, take one slow, deliberate breath and let it settle you. The breath discharges the excess charge so the energy fuels focus instead of scatter. Return to the breath any time you feel yourself speeding up.",
    practiceFormat:
      "Pick topics you're passionate about. Breathe, then speak for 60 seconds. Each time you feel scatter rising, pause and breathe again. Do 4-5 rounds.",
    whatToWatchFor:
      "Watch for shallow, rushed breaths that don't settle anything. The breath must be slow enough to actually calm the system.",
    successStandard:
      "You can speak about something you care about with focused intensity instead of scatter.",
    whenToUse:
      "Use when you sound scattered when you care a lot. High emotional charge outpaces structure; the breath re-regulates it.",
    tags: ["scattered", "breath", "composure", "focus", "emotion"],
    timing: "8-10 minutes daily",
    timingMinutes: 9,
    timelineSummary:
      "Week 1: breath anchor before passionate topics. Weeks 2-3: use it live. Week 4: caring fuels focus, not scatter.",
  }),
  seed({
    problemNumber: 11,
    problemTitle: "I Sound Scattered When I Care a Lot",
    exerciseIndex: 2,
    slug: "p11-e2-three-sentence-rule",
    name: "Three-Sentence Rule",
    purpose:
      "Contain high-energy topics inside a strict three-sentence answer.",
    problemItSolves:
      "When you care, one point spills into ten; a three-sentence cap forces selection.",
    instructionsBody:
      "Answer a topic you care about in exactly three sentences: claim, support, close. The cap forces you to choose your best material and leave the rest, converting scattered passion into a tight, powerful statement.",
    practiceFormat:
      "Take 5 topics you're passionate about. Answer each in exactly three sentences. Record and count — no more, no fewer.",
    whatToWatchFor:
      "Watch for run-on sentences that smuggle in extra points. Three real sentences, each doing one job.",
    successStandard:
      "You can compress a topic you care deeply about into three clean, complete sentences.",
    whenToUse:
      "Use when you sound scattered when you care a lot. A hard sentence cap channels passion into structure.",
    tags: ["scattered", "concision", "structure", "focus", "emotion"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: three-sentence reps daily. Weeks 2-3: apply to real passionate topics. Week 4: contained intensity by default.",
  }),

  // ── Problem 12 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 12,
    problemTitle: "I Have the Knowledge But Don't Sound Like an Authority",
    exerciseIndex: 1,
    slug: "p12-e1-state-support-stop",
    name: "State-Support-Stop",
    purpose:
      "Make a claim, back it once, and stop — the cadence of an authority.",
    problemItSolves:
      "Experts over-explain and keep justifying, which reads as insecurity, not authority.",
    instructionsBody:
      "State your claim plainly. Support it with one strong reason or example. Then stop — no piling on more proof. Authorities state and stop; the confidence to end there is what signals expertise more than the volume of evidence.",
    practiceFormat:
      "Take 5 claims in your area. For each: state, support once, stop. Record and confirm you resisted the urge to keep justifying.",
    whatToWatchFor:
      "Watch for adding 'and another thing…' after the stop. Over-support undercuts authority.",
    successStandard:
      "You can make a claim, support it once, and stop without over-explaining.",
    whenToUse:
      "Use when you have the knowledge but don't sound like an authority. Over-justifying signals doubt; state-support-stop signals command.",
    tags: ["authority", "expertise", "concision", "structure", "confidence"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: state-support-stop reps. Weeks 2-3: apply live. Week 4: authoritative cadence by default.",
  }),
  seed({
    problemNumber: 12,
    problemTitle: "I Have the Knowledge But Don't Sound Like an Authority",
    exerciseIndex: 2,
    slug: "p12-e2-authority-opening-bank",
    name: "Authority Opening Bank",
    purpose:
      "Build a set of confident opening lines that frame you as the expert from word one.",
    problemItSolves:
      "Weak, hedging openings undercut authority before your knowledge can show.",
    instructionsBody:
      "Create a bank of strong opening lines you can deploy — direct claims, clear positions, confident frames. Having ready-made authoritative opens means you never start with 'um, well, I think maybe'; you start from strength.",
    practiceFormat:
      "Write 8-10 authoritative opening lines for common topics you speak on. Practise delivering each cold. Rotate them into real answers.",
    whatToWatchFor:
      "Watch for openings that are confident in wording but hedged in delivery. The line and the voice must both project authority.",
    successStandard:
      "You have a bank of strong opens and reach for one automatically instead of hedging.",
    whenToUse:
      "Use when you have the knowledge but don't sound like an authority. The first line sets the frame; a strong open establishes expertise instantly.",
    tags: ["authority", "expertise", "opening", "confidence", "framing"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: build the opening bank. Weeks 2-3: deploy opens live. Week 4: authoritative starts are automatic.",
  }),

  // ── Problem 13 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 13,
    problemTitle: "I Don't Feel Like Myself When I Speak",
    exerciseIndex: 1,
    slug: "p13-e1-mirror-recording",
    name: "Mirror Recording",
    purpose:
      "Close the gap between how you feel inside and how you appear by observing yourself.",
    problemItSolves:
      "You don't recognise your speaking self because you've never calmly watched it.",
    instructionsBody:
      "Record yourself speaking naturally and watch it back with curiosity, not judgement. Notice where you look most like yourself and where a mask appears. Watching builds an accurate self-image and lets you keep the real you and drop the performance.",
    practiceFormat:
      "Record 3 short clips on comfortable topics. Watch each back, noting the most authentic moments. Do a fourth take aiming to stay in those moments.",
    whatToWatchFor:
      "Watch for spiralling into harsh self-criticism, which shuts down authenticity. Observe like a coach, not a critic.",
    successStandard:
      "You recognise yourself on camera and can identify your genuine, natural moments.",
    whenToUse:
      "Use when you don't feel like yourself when you speak. A distorted self-image drives the disconnect; calm observation corrects it.",
    tags: ["authenticity", "self-image", "camera", "naturalness", "presence"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: record and observe. Weeks 2-3: reinforce authentic moments. Week 4: you recognise yourself speaking.",
  }),
  seed({
    problemNumber: 13,
    problemTitle: "I Don't Feel Like Myself When I Speak",
    exerciseIndex: 2,
    slug: "p13-e2-service-frame-shift",
    name: "Service Frame Shift",
    purpose:
      "Shift focus from how you come across to how you can serve the listener.",
    problemItSolves:
      "Self-consciousness makes you perform a version of yourself; service focus returns you to yourself.",
    instructionsBody:
      "Reframe speaking as service: your job is to give the listener something useful, not to be impressive. When the attention moves to what they need, self-consciousness fades and you naturally sound like yourself again.",
    practiceFormat:
      "Before each rep, name what the listener will gain. Speak from that intention. Compare to a self-focused take and feel the difference in ease.",
    whatToWatchFor:
      "Watch for the focus sliding back to self-image mid-answer. Keep returning to 'what do they need?'",
    successStandard:
      "You speak from a service intention and feel like yourself instead of performing.",
    whenToUse:
      "Use when you don't feel like yourself when you speak. Self-focus creates a mask; a service frame removes it.",
    tags: ["authenticity", "service", "intention", "presence", "connection"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: set a service frame each rep. Weeks 2-3: use it live. Week 4: service focus is your default stance.",
  }),

  // ── Problem 14 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 14,
    problemTitle: "I Can't Stay Clear Under High Stakes",
    exerciseIndex: 1,
    slug: "p14-e1-pre-pressure-anchor-phrase",
    name: "Pre-Pressure Anchor Phrase",
    purpose:
      "Use a rehearsed phrase to ground yourself the instant stakes rise.",
    problemItSolves:
      "High stakes scatter your clarity; a rehearsed anchor phrase re-centres you fast.",
    instructionsBody:
      "Prepare one short anchor phrase — a calm, grounding line you can say to yourself before a high-stakes moment (e.g. 'One point, clearly'). Rehearse it until it reliably drops you into a clear, focused state on cue.",
    practiceFormat:
      "Choose your anchor phrase. Before each high-pressure practice answer, say it silently, then speak. Do 8-10 reps until the phrase reliably calms you.",
    whatToWatchFor:
      "Watch for choosing a phrase that adds pressure ('don't mess up'). The anchor must calm and focus, not threaten.",
    successStandard:
      "Your anchor phrase reliably drops you into a clear, focused state before high-stakes speaking.",
    whenToUse:
      "Use when you can't stay clear under high stakes. Stakes trigger stress that fragments thinking; a rehearsed anchor re-regulates you.",
    tags: ["pressure", "high-stakes", "clarity", "anchor", "composure"],
    timing: "8-10 minutes daily",
    timingMinutes: 9,
    timelineSummary:
      "Week 1: build and rehearse the anchor phrase. Weeks 2-3: use it before real stakes. Week 4: instant grounding on cue.",
  }),
  seed({
    problemNumber: 14,
    problemTitle: "I Can't Stay Clear Under High Stakes",
    exerciseIndex: 2,
    slug: "p14-e2-escalating-pressure-drill",
    name: "Escalating Pressure Drill",
    purpose:
      "Build clarity that holds by practising under gradually increasing pressure.",
    problemItSolves:
      "Clarity trained only in calm collapses under stakes; graded pressure builds resilience.",
    instructionsBody:
      "Practise the same clear delivery under steadily rising pressure — start alone, then on camera, then in front of one person, then a group, then with a timer or tough questions. Each step raises the stakes so your clarity learns to hold when it counts.",
    practiceFormat:
      "Run the same answer through escalating conditions across the week: alone → camera → one listener → small group. Keep clarity constant at each level.",
    whatToWatchFor:
      "Watch for skipping levels too fast, which causes collapse. Only raise the stakes once clarity holds at the current level.",
    successStandard:
      "Your clarity stays intact even at the highest pressure level you practise.",
    whenToUse:
      "Use when you can't stay clear under high stakes. Clarity must be trained under pressure, not just in calm, to transfer to real moments.",
    tags: ["pressure", "high-stakes", "clarity", "exposure", "resilience"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: alone and on camera. Weeks 2-3: add live listeners. Week 4: clarity holds at high stakes.",
  }),

  // ── Problem 15 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 15,
    problemTitle: "I Have No Rhythm or Presence",
    exerciseIndex: 1,
    slug: "p15-e1-three-register-practice",
    name: "Three-Register Practice",
    purpose:
      "Develop vocal range by deliberately shifting between three delivery registers.",
    problemItSolves:
      "A single flat register gives you no rhythm; range creates presence.",
    instructionsBody:
      "Practise the same content in three registers — a warm conversational tone, an energised elevated tone, and a slow grounded tone. Learning to move between them gives your delivery dynamic range, which is the raw material of rhythm and presence.",
    practiceFormat:
      "Take one passage. Deliver it in each of the three registers, then in a version that moves between them. Record and listen for the added life.",
    whatToWatchFor:
      "Watch for the registers all sounding the same, or for shifts that feel forced. Aim for distinct, natural changes.",
    successStandard:
      "You can move fluidly between three distinct registers, and your delivery has audible rhythm.",
    whenToUse:
      "Use when you have no rhythm or presence. Flat, single-register delivery lacks the variation that creates presence.",
    tags: ["presence", "rhythm", "vocal-range", "delivery", "dynamics"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: practise each register. Weeks 2-3: move between them. Week 4: dynamic range in real speaking.",
  }),
  seed({
    problemNumber: 15,
    problemTitle: "I Have No Rhythm or Presence",
    exerciseIndex: 2,
    slug: "p15-e2-sentence-stress-mapping",
    name: "Sentence Stress Mapping",
    purpose:
      "Choose which words to stress so meaning and rhythm both come through.",
    problemItSolves:
      "Even stress on every word flattens delivery; selective stress creates rhythm and meaning.",
    instructionsBody:
      "Take a sentence and mark the one or two words that carry the meaning. Deliver it stressing only those words and letting the rest recede. Selective emphasis creates natural rhythm and makes your meaning unmistakable.",
    practiceFormat:
      "Write 5 sentences. For each, underline the key words and deliver stressing only those. Record and confirm the rhythm and meaning both land.",
    whatToWatchFor:
      "Watch for stressing too many words (which flattens again) or the wrong words (which distorts meaning). Choose deliberately.",
    successStandard:
      "You can map and deliver stress so each sentence has clear rhythm and its meaning pops.",
    whenToUse:
      "Use when you have no rhythm or presence. Uniform stress removes rhythm; strategic stress restores it.",
    tags: ["presence", "rhythm", "emphasis", "delivery", "meaning"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: map stress on written lines. Weeks 2-3: apply live. Week 4: natural, meaningful rhythm.",
  }),

  // ── Problem 16 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 16,
    problemTitle: "I Struggle to Say Hard Things",
    exerciseIndex: 1,
    slug: "p16-e1-hard-sentence-first",
    name: "Hard Sentence First",
    purpose:
      "Lead with the difficult message instead of burying it under softening.",
    problemItSolves:
      "You bury hard messages under so much cushioning the point never lands.",
    instructionsBody:
      "Write the hard thing as one clear sentence and say it first, before any softening. Leading with it — kindly but directly — respects the listener and ensures the message is actually received rather than lost in a fog of hedging.",
    practiceFormat:
      "Take 3 hard messages you need to deliver. Write each as one direct sentence and say it first, then follow with context. Record and check the hard part is unmistakable.",
    whatToWatchFor:
      "Watch for burying the sentence under preamble, or delivering it so bluntly it reads as harsh. Direct and kind, not cushioned or cruel.",
    successStandard:
      "You can deliver a hard message clearly in the first sentence, with warmth intact.",
    whenToUse:
      "Use when you struggle to say hard things. Over-softening protects your comfort but obscures the message; leading with it delivers it cleanly.",
    tags: ["hard-conversations", "directness", "clarity", "candor", "courage"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: write and say hard sentences first. Weeks 2-3: apply in real conversations. Week 4: directness with warmth by default.",
  }),
  seed({
    problemNumber: 16,
    problemTitle: "I Struggle to Say Hard Things",
    exerciseIndex: 2,
    slug: "p16-e2-see-need-acknowledge",
    name: "See-Need-Acknowledge",
    purpose:
      "Frame a hard message with empathy so it's both honest and receivable.",
    problemItSolves:
      "You avoid hard things for fear of hurting; a structure lets you be honest and humane.",
    instructionsBody:
      "Use three beats: name what you See (the observable situation), state what you Need (the change or ask), and Acknowledge the other person's perspective or feelings. The structure lets you be direct about the hard thing while staying empathetic.",
    practiceFormat:
      "Take 3 difficult situations. For each, script the See-Need-Acknowledge beats and deliver them aloud. Record and confirm all three are present and genuine.",
    whatToWatchFor:
      "Watch for the Acknowledge beat becoming an excuse that dilutes the Need, or for skipping it entirely and sounding cold.",
    successStandard:
      "You can deliver a hard message with all three beats — clear, direct, and empathetic.",
    whenToUse:
      "Use when you struggle to say hard things. Fear of harm drives avoidance; a structure that includes empathy lets you speak honestly.",
    tags: ["hard-conversations", "empathy", "structure", "candor", "directness"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: script See-Need-Acknowledge. Weeks 2-3: use it in real talks. Week 4: honest and humane by default.",
  }),

  // ── Problem 17 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 17,
    problemTitle: "I Over-Explain",
    exerciseIndex: 1,
    slug: "p17-e1-two-minute-to-20-second-compression",
    name: "Two-Minute to 20-Second Compression",
    purpose:
      "Compress a long explanation to 20 seconds to break the over-explaining habit.",
    problemItSolves:
      "You keep adding detail to be safe; radical compression proves brevity is enough.",
    instructionsBody:
      "Take something you'd normally explain in two minutes and deliver it in 20 seconds. The brutal cut forces you to keep only the essential and trust the listener to ask for more. It retrains the instinct that more explanation equals better.",
    practiceFormat:
      "Take 3 things you tend to over-explain. Deliver each in 20 seconds. Record and confirm the listener would still get the point.",
    whatToWatchFor:
      "Watch for talking faster instead of cutting content. Compression is fewer words, not rushed words.",
    successStandard:
      "You can deliver a normally-long explanation in 20 seconds and it still lands.",
    whenToUse:
      "Use when you over-explain. Over-explaining comes from anxiety that the listener won't understand; compression proves they will.",
    tags: ["over-explaining", "concision", "compression", "clarity", "brevity"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: 20-second compressions daily. Weeks 2-3: apply live. Week 4: brevity becomes the default.",
  }),
  seed({
    problemNumber: 17,
    problemTitle: "I Over-Explain",
    exerciseIndex: 2,
    slug: "p17-e2-one-idea-test",
    name: "One-Idea Test",
    purpose:
      "Test every explanation against the question: is this one idea or several?",
    problemItSolves:
      "Over-explaining smuggles multiple ideas into one answer; the test catches them.",
    instructionsBody:
      "Before and after explaining, ask: 'Is this one idea?' If you're carrying several, split them or drop all but the most important. The test keeps each explanation focused on a single point so it stays lean.",
    practiceFormat:
      "Take 5 explanations. Run each through the one-idea test, trimming to a single idea. Record the trimmed versions and confirm each holds exactly one.",
    whatToWatchFor:
      "Watch for defending extra ideas as 'necessary context'. Most over-explanation is optional detail dressed as necessity.",
    successStandard:
      "You can identify and remove extra ideas so each explanation carries just one.",
    whenToUse:
      "Use when you over-explain. Multiple ideas packed together read as over-explaining; the one-idea test enforces focus.",
    tags: ["over-explaining", "focus", "concision", "clarity", "one-idea"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: apply the test on prepared answers. Weeks 2-3: use it live. Week 4: single-idea explanations by default.",
  }),

  // ── Problem 18 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 18,
    problemTitle: "I Can't Turn Raw Thoughts Into Polished Speech",
    exerciseIndex: 1,
    slug: "p18-e1-star-framework",
    name: "STAR Framework",
    purpose:
      "Give raw experiences an instant structure: Situation, Task, Action, Result.",
    problemItSolves:
      "Raw thoughts come out unstructured; STAR gives them a ready-made polished shape.",
    instructionsBody:
      "Organise any experience or example into four beats: the Situation, the Task you faced, the Action you took, and the Result you got. STAR converts a jumble of raw memories into a clean, polished narrative on demand.",
    practiceFormat:
      "Take 3 real experiences. Tell each using STAR, one beat at a time. Record and confirm all four beats are present and in order.",
    whatToWatchFor:
      "Watch for the Situation ballooning and crowding out the Action and Result. Keep the setup brief; land the result.",
    successStandard:
      "You can turn a raw experience into a polished STAR story within a beat of being asked.",
    whenToUse:
      "Use when you can't turn raw thoughts into polished speech. Raw material needs a container; STAR is a reliable one for experiences.",
    tags: ["structure", "STAR", "storytelling", "polish", "clarity"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: STAR on prepared stories. Weeks 2-3: use it live. Week 4: instant polished narratives.",
  }),
  seed({
    problemNumber: 18,
    problemTitle: "I Can't Turn Raw Thoughts Into Polished Speech",
    exerciseIndex: 2,
    slug: "p18-e2-topic-sentence-habit",
    name: "Topic Sentence Habit",
    purpose:
      "Open every chunk of speech with a topic sentence that frames what follows.",
    problemItSolves:
      "Raw thoughts arrive without headlines; a topic sentence organises them for the listener.",
    instructionsBody:
      "Start each block of speech with a topic sentence that states what the block is about, then fill in the detail. Like a paragraph's first line, it organises your raw thoughts on the fly and keeps the listener oriented.",
    practiceFormat:
      "Take 5 topics. For each, say a topic sentence first, then two or three supporting sentences. Record and confirm each block opens with a clear headline.",
    whatToWatchFor:
      "Watch for jumping into detail before the topic sentence, or topic sentences that are vague. The headline must actually frame the block.",
    successStandard:
      "Every block of your speech opens with a clear topic sentence that frames it.",
    whenToUse:
      "Use when you can't turn raw thoughts into polished speech. Topic sentences impose structure in real time, making raw thinking sound organised.",
    tags: ["structure", "topic-sentence", "polish", "clarity", "organization"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: topic sentences on prepared blocks. Weeks 2-3: use them live. Week 4: headline-first speech by default.",
  }),

  // ── Problem 19 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 19,
    problemTitle: "I Sound Monotone Even When I'm Energized",
    exerciseIndex: 1,
    slug: "p19-e1-energized-register-drill",
    name: "Energized Register Drill",
    purpose:
      "Translate internal energy into audible vocal variation.",
    problemItSolves:
      "You feel energised inside but it doesn't reach your voice, so you sound flat.",
    instructionsBody:
      "Practise deliberately pushing your felt energy into your voice — more pitch movement, more pace variation, more emphasis. The exercise builds the link between internal state and vocal output so your energy actually reaches the listener.",
    practiceFormat:
      "Take a topic you're excited about. Deliver it once normally, then again exaggerating the vocal energy. Record both and find the level where your voice matches your feeling.",
    whatToWatchFor:
      "Watch for the energy staying internal while the voice stays flat, or for pushing so hard it sounds fake. Find the honest match.",
    successStandard:
      "Your voice audibly reflects the energy you feel inside.",
    whenToUse:
      "Use when you sound monotone even when energized. The energy exists but isn't transmitted vocally; this drill builds the transmission.",
    tags: ["monotone", "energy", "vocal-range", "delivery", "expressiveness"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: push energy into the voice. Weeks 2-3: calibrate the match. Week 4: energy reaches the listener.",
  }),
  seed({
    problemNumber: 19,
    problemTitle: "I Sound Monotone Even When I'm Energized",
    exerciseIndex: 2,
    slug: "p19-e2-read-aloud-rhythm-builder",
    name: "Read-Aloud Rhythm Builder",
    purpose:
      "Build vocal variation by reading expressive text aloud with full color.",
    problemItSolves:
      "A monotone habit needs re-training; expressive reading rebuilds range.",
    instructionsBody:
      "Read passages aloud — stories, speeches, poetry — with full expressiveness, exaggerating pitch, pace, and emphasis. Borrowing the built-in rhythm of good writing retrains your voice out of the monotone groove and into natural variation.",
    practiceFormat:
      "Read one expressive passage aloud daily, pushing the vocal color. Record and listen for growing range. Rotate passages across the week.",
    whatToWatchFor:
      "Watch for reading fast and flat instead of expressive. The point is variation, not speed.",
    successStandard:
      "Your read-aloud delivery has clear pitch, pace, and emphasis variation that carries into your speaking.",
    whenToUse:
      "Use when you sound monotone even when energized. Reading expressive text aloud rebuilds the vocal range a monotone habit erased.",
    tags: ["monotone", "rhythm", "vocal-range", "read-aloud", "expressiveness"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: expressive read-aloud daily. Weeks 2-3: transfer range to speaking. Week 4: natural variation by default.",
  }),

  // ── Problem 20 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 20,
    problemTitle: "I Use Too Many Filler Words",
    exerciseIndex: 1,
    slug: "p20-e1-count-and-replace",
    name: "Count and Replace",
    purpose:
      "Make fillers conscious by counting them, then replace them with silence.",
    problemItSolves:
      "Fillers are unconscious; counting them makes them visible and replaceable.",
    instructionsBody:
      "Record yourself and count every 'um', 'uh', 'like', 'you know'. Then redeliver, replacing each filler with a short silent pause. Awareness plus the pause substitute steadily strips the fillers out.",
    practiceFormat:
      "Record a daily answer, count the fillers, then redo it replacing each with silence. Track the count dropping across the week.",
    whatToWatchFor:
      "Watch for swapping one filler for another ('um' becomes 'so'), or for uncomfortable rushing to avoid pauses. Let the silence sit.",
    successStandard:
      "Your filler count drops sharply and pauses replace them cleanly.",
    whenToUse:
      "Use when you use too many filler words. Fillers fill the gap while you think; awareness plus deliberate silence replaces them.",
    tags: ["fillers", "pause", "clarity", "awareness", "polish"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: count and replace daily. Weeks 2-3: catch fillers live. Week 4: pauses replace fillers by default.",
  }),
  seed({
    problemNumber: 20,
    problemTitle: "I Use Too Many Filler Words",
    exerciseIndex: 2,
    slug: "p20-e2-finger-walking-exercise",
    name: "Finger-Walking Exercise",
    purpose:
      "Use a physical cue to interrupt the filler reflex in real time.",
    problemItSolves:
      "Fillers are automatic; a physical anchor gives you a way to catch and stop them.",
    instructionsBody:
      "As you speak, 'walk' two fingers across a surface, moving them only while you make sound and stopping them during pauses. The physical feedback makes fillers tangible and trains you to pause silently instead of filling.",
    practiceFormat:
      "Speak for 60 seconds while finger-walking. Stop the fingers on every pause; notice each filler as an unwanted movement. Do 4-5 rounds.",
    whatToWatchFor:
      "Watch for the fingers moving continuously (which mirrors continuous filler). The goal is clean stops on silences.",
    successStandard:
      "You can pause silently, with the physical cue confirming fillers have dropped away.",
    whenToUse:
      "Use when you use too many filler words. A physical anchor interrupts the automatic filler reflex and builds comfort with silence.",
    tags: ["fillers", "pause", "physical-anchor", "awareness", "polish"],
    timing: "8-10 minutes daily",
    timingMinutes: 9,
    timelineSummary:
      "Week 1: finger-walking reps daily. Weeks 2-3: internalise the pause. Week 4: silent pauses replace fillers.",
  }),

  // ── Problem 21 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 21,
    problemTitle: "I Think Too Much Before Speaking",
    exerciseIndex: 1,
    slug: "p21-e1-bridge-phrase-launch",
    name: "Bridge Phrase Launch",
    purpose:
      "Use a ready bridge phrase to start talking before the full answer is formed.",
    problemItSolves:
      "You wait for the perfect complete answer; a bridge phrase lets you launch and build.",
    instructionsBody:
      "Keep a few bridge phrases ready ('The way I see it…', 'What matters here is…') and use one to start speaking immediately. The bridge buys a moment while your brain assembles the rest, breaking the habit of over-thinking before you begin.",
    practiceFormat:
      "Answer 5 surprise questions, each starting with a bridge phrase, then continue. Record and confirm you launched quickly instead of stalling.",
    whatToWatchFor:
      "Watch for stacking multiple bridge phrases (which becomes stalling) or pausing to over-think even with the bridge available.",
    successStandard:
      "You launch into answers with a bridge phrase instead of stalling to think.",
    whenToUse:
      "Use when you think too much before speaking. Over-thinking waits for perfection; a bridge phrase lets you start and let the answer form as you go.",
    tags: ["overthinking", "bridge-phrase", "flow", "launch", "spontaneity"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: launch with bridge phrases. Weeks 2-3: use them live. Week 4: quick starts by default.",
  }),
  seed({
    problemNumber: 21,
    problemTitle: "I Think Too Much Before Speaking",
    exerciseIndex: 2,
    slug: "p21-e2-three-second-commitment-rule",
    name: "Three-Second Commitment Rule",
    purpose:
      "Commit to speaking within three seconds of being asked.",
    problemItSolves:
      "Long silent deliberation reads as uncertainty; a three-second cap forces commitment.",
    instructionsBody:
      "Give yourself a maximum of three seconds after any question before you must start speaking. The tight window stops the over-thinking spiral and trains you to trust your first instinct instead of endlessly refining it in your head.",
    practiceFormat:
      "Have questions fired at you. Count three seconds, then you must speak. Do 8-10 reps and shrink the gap over time.",
    whatToWatchFor:
      "Watch for using the three seconds to script a whole answer. It's a launch window, not a planning session.",
    successStandard:
      "You reliably start speaking within three seconds, trusting your first instinct.",
    whenToUse:
      "Use when you think too much before speaking. A hard time cap breaks the deliberation loop and builds trust in your instincts.",
    tags: ["overthinking", "commitment", "spontaneity", "flow", "timing"],
    timing: "8-10 minutes daily",
    timingMinutes: 9,
    timelineSummary:
      "Week 1: three-second reps daily. Weeks 2-3: apply live. Week 4: fast commitment by default.",
  }),

  // ── Problem 22 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 22,
    problemTitle: "I Can't Push Back Without Feeling Guilty",
    exerciseIndex: 1,
    slug: "p22-e1-acknowledge-maintain-invite",
    name: "Acknowledge-Maintain-Invite",
    purpose:
      "Push back respectfully by acknowledging, holding your position, and inviting response.",
    problemItSolves:
      "You collapse or apologise when disagreeing; a structure lets you hold firm and kind.",
    instructionsBody:
      "Use three beats: Acknowledge the other view genuinely, Maintain your own position clearly, and Invite their response. The structure lets you disagree without hostility and hold your ground without guilt, because you've honoured them and yourself.",
    practiceFormat:
      "Take 3 disagreements. Script Acknowledge-Maintain-Invite for each and deliver aloud. Record and confirm you maintained your position without over-apologising.",
    whatToWatchFor:
      "Watch for the Acknowledge beat collapsing into agreement, or the Maintain beat softening into a question. Hold the middle firmly.",
    successStandard:
      "You can push back clearly with all three beats and without guilt or aggression.",
    whenToUse:
      "Use when you can't push back without feeling guilty. Guilt comes from equating disagreement with disrespect; a structure lets you do both honour and hold.",
    tags: ["pushback", "assertiveness", "structure", "disagreement", "boundaries"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: script the three beats. Weeks 2-3: use them in real pushback. Week 4: guilt-free disagreement by default.",
  }),
  seed({
    problemNumber: 22,
    problemTitle: "I Can't Push Back Without Feeling Guilty",
    exerciseIndex: 2,
    slug: "p22-e2-position-statement-drill",
    name: "Position Statement Drill",
    purpose:
      "State your position as a clear, standalone claim without apology.",
    problemItSolves:
      "You wrap your position in so many apologies it loses force and invites guilt.",
    instructionsBody:
      "Practise stating your position as one clean sentence — no 'sorry', no 'this might be dumb', no over-qualifying. A clear position statement asserts your view as legitimate, which both strengthens the pushback and removes the guilt of hedging.",
    practiceFormat:
      "Take 5 positions you hold. State each as one clean, unapologetic sentence. Record and confirm no apologies or excessive qualifiers slipped in.",
    whatToWatchFor:
      "Watch for reflexive 'sorry' or 'just my opinion' undercutting the statement. State the position as legitimate.",
    successStandard:
      "You can state your position in one clean sentence without apology or hedging.",
    whenToUse:
      "Use when you can't push back without feeling guilty. Apologetic framing signals your view is illegitimate; a clean position statement asserts it plainly.",
    tags: ["pushback", "assertiveness", "position", "boundaries", "confidence"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: clean position statements daily. Weeks 2-3: use them live. Week 4: unapologetic positions by default.",
  }),

  // ── Problem 23 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 23,
    problemTitle: "I Drift Off-Topic",
    exerciseIndex: 1,
    slug: "p23-e1-anchor-word-return",
    name: "Anchor Word Return",
    purpose:
      "Use an anchor word to detect drift and steer back to the point.",
    problemItSolves:
      "You wander from the topic without noticing; an anchor word gives you a homing signal.",
    instructionsBody:
      "Set one anchor word for your topic before speaking. As you talk, keep checking against it — if what you're saying no longer connects to the anchor, you've drifted, and repeating the anchor word steers you back on topic.",
    practiceFormat:
      "Pick a topic and anchor word. Speak for 90 seconds, returning to the anchor whenever you drift. Record and mark each drift-and-return.",
    whatToWatchFor:
      "Watch for tangents that feel relevant but aren't. If it doesn't connect to the anchor, it's drift.",
    successStandard:
      "You notice drift quickly and return to the topic via the anchor word.",
    whenToUse:
      "Use when you drift off-topic. Association pulls you sideways; an anchor word makes drift detectable and reversible.",
    tags: ["off-topic", "anchor", "focus", "structure", "clarity"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: anchor-word returns on prepared topics. Weeks 2-3: use live. Week 4: drift caught automatically.",
  }),
  seed({
    problemNumber: 23,
    problemTitle: "I Drift Off-Topic",
    exerciseIndex: 2,
    slug: "p23-e2-verbal-signpost-drill",
    name: "Verbal Signpost Drill",
    purpose:
      "Use signposts to keep both you and the listener oriented on the through-line.",
    problemItSolves:
      "Without signposts, you and the listener lose track of where the point is.",
    instructionsBody:
      "Practise dropping verbal signposts as you speak — 'my main point is…', 'the key takeaway…', 'to bring it back…'. Signposts force you to know where you are in your argument and keep you (and the listener) tethered to the through-line.",
    practiceFormat:
      "Take 3 topics. Deliver each while dropping at least two signposts that keep the structure visible. Record and confirm the through-line stayed clear.",
    whatToWatchFor:
      "Watch for signposts that don't match the actual structure, or overusing them so they become filler. Use them to genuinely orient.",
    successStandard:
      "You can use signposts to keep your speech clearly on its through-line.",
    whenToUse:
      "Use when you drift off-topic. Signposts make your structure explicit, keeping you anchored to the main line.",
    tags: ["off-topic", "signposting", "structure", "focus", "clarity"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: practise signposts on prepared talks. Weeks 2-3: use live. Week 4: signposting keeps you on track.",
  }),

  // ── Problem 24 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 24,
    problemTitle: "I Sound Too Academic, Not Human",
    exerciseIndex: 1,
    slug: "p24-e1-jargon-translation",
    name: "Jargon Translation",
    purpose:
      "Translate jargon and abstraction into plain, human language.",
    problemItSolves:
      "Academic, jargon-heavy speech distances the listener; plain language connects.",
    instructionsBody:
      "Take your jargon-laden sentences and translate each into how you'd say it to a friend over coffee. Swap abstract nouns for concrete verbs, technical terms for everyday words. The plain version sounds human and lands far better.",
    practiceFormat:
      "Take 5 jargon-heavy sentences. Translate each into plain, conversational language and say it aloud. Record and confirm it sounds like a person, not a paper.",
    whatToWatchFor:
      "Watch for keeping one or two comfort-blanket jargon terms, or dumbing down to the point of losing meaning. Plain but accurate.",
    successStandard:
      "You can translate any jargon sentence into warm, plain language that keeps its meaning.",
    whenToUse:
      "Use when you sound too academic, not human. Jargon and abstraction create distance; plain language rebuilds the human connection.",
    tags: ["academic", "jargon", "plain-language", "humanity", "clarity"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: translate jargon daily. Weeks 2-3: speak plainly live. Week 4: human language by default.",
  }),
  seed({
    problemNumber: 24,
    problemTitle: "I Sound Too Academic, Not Human",
    exerciseIndex: 2,
    slug: "p24-e2-personal-story-injection",
    name: "Personal Story Injection",
    purpose:
      "Warm up abstract content by injecting a short personal story.",
    problemItSolves:
      "Pure abstraction feels cold; a personal story makes it human and memorable.",
    instructionsBody:
      "For any abstract point, attach a brief personal story or concrete moment that shows it in real life. The story grounds the abstraction in human experience, making you sound like a person sharing something real rather than a textbook.",
    practiceFormat:
      "Take 3 abstract points. Attach a short personal story to each and deliver point-plus-story aloud. Record and confirm the story makes it feel human.",
    whatToWatchFor:
      "Watch for stories that are too long or don't actually illustrate the point. The story serves the point, not the other way around.",
    successStandard:
      "You can pair any abstract point with a short, relevant personal story that warms it up.",
    whenToUse:
      "Use when you sound too academic, not human. Personal stories inject the humanity that abstraction strips away.",
    tags: ["academic", "storytelling", "humanity", "connection", "concreteness"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: attach stories to points. Weeks 2-3: use them live. Week 4: story-grounded points by default.",
  }),

  // ── Problem 25 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 25,
    problemTitle: "I Know What to Say But Can't Find the Words",
    exerciseIndex: 1,
    slug: "p25-e1-keep-moving-drill",
    name: "Keep-Moving Drill",
    purpose:
      "Train yourself to keep speaking through a word-search instead of freezing.",
    problemItSolves:
      "When a word won't come you stop dead; keep-moving trains you to talk around it.",
    instructionsBody:
      "When the exact word won't come, don't stop — describe it, approximate it, or say it another way and keep going. The drill builds the reflex of flowing around a gap rather than freezing on it, so a missing word never stalls you.",
    practiceFormat:
      "Speak on a topic for 90 seconds without stopping, even when a word escapes you — talk around it and continue. Record and note that you never froze.",
    whatToWatchFor:
      "Watch for stopping to hunt for the perfect word. The skill is momentum through approximation, not precision.",
    successStandard:
      "You keep speaking smoothly even when a specific word won't come.",
    whenToUse:
      "Use when you know what to say but can't find the words. Word-retrieval gaps are normal; the fix is flowing around them, not freezing.",
    tags: ["word-finding", "flow", "recovery", "composure", "fluency"],
    timing: "8-10 minutes daily",
    timingMinutes: 9,
    timelineSummary:
      "Week 1: keep-moving reps daily. Weeks 2-3: apply live. Week 4: you flow around gaps automatically.",
  }),
  seed({
    problemNumber: 25,
    problemTitle: "I Know What to Say But Can't Find the Words",
    exerciseIndex: 2,
    slug: "p25-e2-read-aloud-vocabulary",
    name: "Read Aloud Vocabulary",
    purpose:
      "Expand and activate your spoken vocabulary through daily reading aloud.",
    problemItSolves:
      "Words don't come because they aren't active; reading aloud activates them for speech.",
    instructionsBody:
      "Read varied material aloud daily to move vocabulary from passive recognition into active, speakable use. Saying the words yourself — not just reading them silently — wires them into your speaking system so they're available when you need them.",
    practiceFormat:
      "Read one rich passage aloud each day, savouring the vocabulary. Then speak on a related topic, deliberately using words you just read. Rotate material across the week.",
    whatToWatchFor:
      "Watch for reading silently or too fast to absorb. The words must be spoken aloud to activate.",
    successStandard:
      "Words you've been reading start surfacing naturally in your own speech.",
    whenToUse:
      "Use when you know what to say but can't find the words. Reading aloud converts passive vocabulary into active, retrievable words.",
    tags: ["word-finding", "vocabulary", "read-aloud", "fluency", "practice"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: daily read-aloud. Weeks 2-3: use new words when speaking. Week 4: richer active vocabulary.",
  }),

  // ── Problem 26 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 26,
    problemTitle: "I Speak Differently 1-on-1 vs in a Group",
    exerciseIndex: 1,
    slug: "p26-e1-one-person-at-a-time",
    name: "One-Person-at-a-Time",
    purpose:
      "Speak to a group as a series of one-on-one connections.",
    problemItSolves:
      "Groups make you perform; addressing one person at a time restores your natural mode.",
    instructionsBody:
      "In a group, deliver each thought to one individual, then move your focus to another for the next thought. Turning the group into a series of one-on-ones keeps you in your comfortable conversational mode instead of a stiff broadcast.",
    practiceFormat:
      "Imagine (or set up) three listeners. Deliver a talk, directing each sentence to one person at a time. Record and confirm it kept the one-on-one warmth.",
    whatToWatchFor:
      "Watch for scanning the room robotically or reverting to broadcast mode. Genuinely connect with one person per thought.",
    successStandard:
      "You speak to a group with the same warmth and ease you have one-on-one.",
    whenToUse:
      "Use when you speak differently one-on-one vs in a group. Groups trigger performance mode; addressing individuals restores your natural voice.",
    tags: ["group-speaking", "connection", "naturalness", "audience", "presence"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: practise one-person-at-a-time. Weeks 2-3: use in real groups. Week 4: same ease in groups.",
  }),
  seed({
    problemNumber: 26,
    problemTitle: "I Speak Differently 1-on-1 vs in a Group",
    exerciseIndex: 2,
    slug: "p26-e2-escalating-audience-drill",
    name: "Escalating Audience Drill",
    purpose:
      "Build group comfort by gradually increasing audience size.",
    problemItSolves:
      "Group anxiety must be desensitised; graded audience size builds tolerance.",
    instructionsBody:
      "Practise the same content in front of gradually larger audiences — one person, then two or three, then a small group. Each step is a manageable stretch that teaches your nervous system that more listeners isn't a threat, closing the group-vs-solo gap.",
    practiceFormat:
      "Across the week, deliver the same material to progressively larger audiences (start with one). Keep your natural style constant at each size.",
    whatToWatchFor:
      "Watch for jumping to a large group too soon and reverting to performance mode. Only scale up once comfortable at the current size.",
    successStandard:
      "Your natural style holds steady as audience size grows.",
    whenToUse:
      "Use when you speak differently one-on-one vs in a group. Graded exposure builds the comfort that keeps your natural voice intact at scale.",
    tags: ["group-speaking", "exposure", "audience", "confidence", "naturalness"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: one to a few listeners. Weeks 2-3: small groups. Week 4: comfort across audience sizes.",
  }),

  // ── Problem 27 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 27,
    problemTitle: "I Repeat Myself",
    exerciseIndex: 1,
    slug: "p27-e1-recording-repetition-audit",
    name: "Recording Repetition Audit",
    purpose:
      "Make your repetition conscious by auditing recordings for repeated points.",
    problemItSolves:
      "You repeat without noticing; auditing recordings makes the pattern visible.",
    instructionsBody:
      "Record yourself and listen back specifically for repeated points and re-said sentences. Mark every repetition. Awareness of when and why you loop (usually to reassure yourself the point landed) is the first step to stopping it.",
    practiceFormat:
      "Record a daily answer. Audit it, tallying every repeated idea or restated point. Track the count dropping across the week.",
    whatToWatchFor:
      "Watch for confusing intentional emphasis with unconscious repetition. Note where the loop is anxiety, not design.",
    successStandard:
      "You can spot your own repetitions and the count drops as awareness grows.",
    whenToUse:
      "Use when you repeat yourself. Repetition is usually unconscious reassurance-seeking; auditing recordings makes it conscious and reducible.",
    tags: ["repetition", "awareness", "concision", "self-review", "clarity"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: audit recordings daily. Weeks 2-3: catch repetition live. Week 4: repetition sharply reduced.",
  }),
  seed({
    problemNumber: 27,
    problemTitle: "I Repeat Myself",
    exerciseIndex: 2,
    slug: "p27-e2-stop-after-the-period",
    name: "Stop After the Period",
    purpose:
      "Train yourself to stop once a point is made instead of re-saying it.",
    problemItSolves:
      "You keep re-explaining after the point is complete; stopping ends the loop.",
    instructionsBody:
      "Make your point once, cleanly, and stop — no restating it in different words 'to be sure'. Practise ending on the period and trusting the point landed. The discipline of stopping is what breaks the repetition habit.",
    practiceFormat:
      "Answer 5 questions, making each point exactly once and stopping. Record and confirm no point was re-said. Sit in the silence after stopping.",
    whatToWatchFor:
      "Watch for the anxious add-on ('so basically what I mean is…'). Trust the point and stop.",
    successStandard:
      "You make each point once and stop without re-explaining.",
    whenToUse:
      "Use when you repeat yourself. Repetition comes from not trusting the point landed; stopping after the period builds that trust.",
    tags: ["repetition", "concision", "trust", "clarity", "discipline"],
    timing: "8-10 minutes daily",
    timingMinutes: 9,
    timelineSummary:
      "Week 1: stop-after-the-period reps. Weeks 2-3: apply live. Week 4: one-and-done points by default.",
  }),

  // ── Problem 28 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 28,
    problemTitle: "I Freeze When I Feel Judged",
    exerciseIndex: 1,
    slug: "p28-e1-bridge-phrase-reflex",
    name: "Bridge Phrase Reflex",
    purpose:
      "Have a reflexive bridge phrase to move through the freeze moment.",
    problemItSolves:
      "Feeling judged triggers a freeze; a reflexive phrase gives you a way to keep moving.",
    instructionsBody:
      "Drill a bridge phrase until it's reflexive ('Here's how I see it…'), so when judgment triggers a freeze you have an automatic line to launch from. The phrase carries you past the frozen instant and back into flow.",
    practiceFormat:
      "Simulate being judged (harsh questions, evaluative eyes) and respond by launching with the bridge phrase every time. Do 8-10 reps until it's reflexive.",
    whatToWatchFor:
      "Watch for the freeze winning before the phrase fires. Drill it enough that the phrase is faster than the freeze.",
    successStandard:
      "When you feel judged, the bridge phrase fires automatically and you keep speaking.",
    whenToUse:
      "Use when you freeze when you feel judged. Judgment triggers a threat-freeze; a reflexive bridge phrase overrides it.",
    tags: ["freeze", "judgment", "bridge-phrase", "composure", "recovery"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: drill the reflex. Weeks 2-3: use it under simulated judgment. Week 4: automatic recovery from freeze.",
  }),
  seed({
    problemNumber: 28,
    problemTitle: "I Freeze When I Feel Judged",
    exerciseIndex: 2,
    slug: "p28-e2-evaluated-exposure-drill",
    name: "Evaluated Exposure Drill",
    purpose:
      "Desensitise the freeze by speaking repeatedly while being evaluated.",
    problemItSolves:
      "The freeze is a fear response to evaluation; controlled exposure reduces the fear.",
    instructionsBody:
      "Deliberately speak while being watched and evaluated in low-stakes settings — ask for critical feedback, record for others, present to a friend playing a tough critic. Repeated exposure to being judged teaches your system it's survivable, and the freeze fades.",
    practiceFormat:
      "Arrange to be evaluated daily — a friend scoring you, camera for an audience, or critical questions. Speak through it each time. Volume of exposure is the goal.",
    whatToWatchFor:
      "Watch for avoiding real evaluation or picking only friendly audiences. The exposure must include genuine judgment to work.",
    successStandard:
      "Being evaluated produces far less freeze and you can keep speaking through it.",
    whenToUse:
      "Use when you freeze when you feel judged. The freeze weakens only through repeated exposure to being evaluated.",
    tags: ["freeze", "judgment", "exposure", "confidence", "resilience"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: low-stakes evaluated reps. Weeks 2-3: raise the scrutiny. Week 4: judgment no longer freezes you.",
  }),

  // ── Problem 29 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 29,
    problemTitle: "I Speed Up When I'm Nervous",
    exerciseIndex: 1,
    slug: "p29-e1-breath-first-protocol",
    name: "Breath-First Protocol",
    purpose:
      "Use the breath to regulate the nervous speed-up before it takes over.",
    problemItSolves:
      "Nerves accelerate your pace; controlled breathing slows the whole system down.",
    instructionsBody:
      "Before and during speaking, use slow, deliberate breaths to keep your nervous system regulated. Nervous speed comes from shallow, fast breathing; lengthening the breath — especially the exhale — physically slows your pace from the source.",
    practiceFormat:
      "Take three slow breaths before speaking, then talk for 60 seconds keeping the breath long. When you feel yourself speeding, breathe and reset. Do 4-5 rounds.",
    whatToWatchFor:
      "Watch for holding the breath under nerves, or breathing shallowly. The exhale must be slow and full to regulate pace.",
    successStandard:
      "You can keep a steady, controlled pace even when nervous, using the breath.",
    whenToUse:
      "Use when you speed up when nervous. Nervous acceleration is driven by breathing; regulating the breath regulates the pace.",
    tags: ["nerves", "pace", "breath", "composure", "regulation"],
    timing: "8-10 minutes daily",
    timingMinutes: 9,
    timelineSummary:
      "Week 1: breath-first before every rep. Weeks 2-3: use it under nerves. Week 4: steady pace when it counts.",
  }),
  seed({
    problemNumber: 29,
    problemTitle: "I Speed Up When I'm Nervous",
    exerciseIndex: 2,
    slug: "p29-e2-deliberate-slow-down-signal",
    name: "Deliberate Slow-Down Signal",
    purpose:
      "Use a personal cue to consciously slow your pace mid-speech.",
    problemItSolves:
      "You don't notice you're rushing; a slow-down signal catches and corrects it.",
    instructionsBody:
      "Choose a signal — a physical cue or a mental word like 'slow' — that you deploy the moment you notice speeding up. The signal interrupts the acceleration and consciously drops you back to a controlled, deliberate pace.",
    practiceFormat:
      "Speak for 90 seconds; every time you catch yourself rushing, use the signal and slow down. Record and mark each catch-and-correct.",
    whatToWatchFor:
      "Watch for not noticing the speed-up at all. Pair this with recording so you calibrate what 'too fast' feels like.",
    successStandard:
      "You catch yourself speeding and consciously slow down using your signal.",
    whenToUse:
      "Use when you speed up when nervous. A conscious slow-down signal gives you a way to catch and correct the rush in real time.",
    tags: ["nerves", "pace", "signal", "self-awareness", "control"],
    timing: "8-10 minutes daily",
    timingMinutes: 9,
    timelineSummary:
      "Week 1: practise the signal. Weeks 2-3: use it live. Week 4: automatic pace correction.",
  }),

  // ── Problem 30 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 30,
    problemTitle: "My Words Don't Connect From A to B",
    exerciseIndex: 1,
    slug: "p30-e1-logical-bridge-sentence",
    name: "Logical Bridge Sentence",
    purpose:
      "Insert an explicit bridge sentence between two ideas so the logic connects.",
    problemItSolves:
      "You jump between ideas without the connecting logic, so listeners can't follow.",
    instructionsBody:
      "Between any two ideas, add a bridge sentence that states how they relate ('which matters because…', 'and that leads to…'). The explicit bridge makes the logical link visible instead of leaving the listener to guess the leap.",
    practiceFormat:
      "Take pairs of ideas. For each pair, write and say the bridge sentence that connects them. Record and confirm the logic now flows A to B.",
    whatToWatchFor:
      "Watch for bridges that just say 'and' without stating a real relationship. The bridge must carry actual logic.",
    successStandard:
      "Your ideas connect with explicit bridges so listeners can follow the logic end to end.",
    whenToUse:
      "Use when your words don't connect from A to B. You skip the connective tissue that's obvious to you; explicit bridges make the logic followable.",
    tags: ["logic", "transitions", "structure", "coherence", "clarity"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: build bridge sentences. Weeks 2-3: use them live. Week 4: connected logic by default.",
  }),
  seed({
    problemNumber: 30,
    problemTitle: "My Words Don't Connect From A to B",
    exerciseIndex: 2,
    slug: "p30-e2-what-so-what-now-what",
    name: "What-So What-Now What",
    purpose:
      "Structure any point through What, So What, and Now What for built-in logic.",
    problemItSolves:
      "Isolated facts don't connect to meaning or action; this structure links them.",
    instructionsBody:
      "Run each point through three beats: What (the fact or situation), So What (why it matters), Now What (the implication or action). The chain forces every fact to connect to meaning and consequence, so your words move logically from A to B to C.",
    practiceFormat:
      "Take 5 facts or observations. Run each through What-So What-Now What aloud. Record and confirm the logical chain holds in each.",
    whatToWatchFor:
      "Watch for stopping at 'What' (just facts) or skipping 'So What' (no meaning). All three beats must be present.",
    successStandard:
      "You can take any fact and connect it to meaning and action through the three beats.",
    whenToUse:
      "Use when your words don't connect from A to B. This structure builds the logical chain from fact to significance to action.",
    tags: ["logic", "structure", "meaning", "coherence", "framework"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: drill the three beats. Weeks 2-3: use live. Week 4: connected reasoning by default.",
  }),

  // ── Problem 31 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 31,
    problemTitle: "I'm Tightest in the Moments That Matter Most",
    exerciseIndex: 1,
    slug: "p31-e1-pre-performance-physiological-reset",
    name: "Pre-Performance Physiological Reset",
    purpose:
      "Reset your body before high-stakes moments so tension doesn't hijack you.",
    problemItSolves:
      "High-stakes moments trigger physical tension; a reset discharges it beforehand.",
    instructionsBody:
      "Before an important moment, run a physiological reset — slow breathing, releasing shoulders and jaw, grounding your stance. Calming the body first prevents the tension that tightens your voice and thinking when it matters most.",
    practiceFormat:
      "Practise a 60-90 second reset routine (breath + muscle release + grounding) before each high-stakes rep. Do it daily until it's a reliable ritual.",
    whatToWatchFor:
      "Watch for a rushed reset that doesn't actually release tension, or skipping it when nervous. The reset matters most exactly when you least feel like doing it.",
    successStandard:
      "You can enter a high-stakes moment physically calm and released, not tight.",
    whenToUse:
      "Use when you're tightest in the moments that matter most. Stakes spike physical tension; a pre-performance reset clears it before you speak.",
    tags: ["high-stakes", "tension", "reset", "physiology", "composure"],
    timing: "8-10 minutes daily",
    timingMinutes: 9,
    timelineSummary:
      "Week 1: build the reset routine. Weeks 2-3: use it before real stakes. Week 4: calm entry by default.",
  }),
  seed({
    problemNumber: 31,
    problemTitle: "I'm Tightest in the Moments That Matter Most",
    exerciseIndex: 2,
    slug: "p31-e2-progressive-stakes-drill",
    name: "Progressive Stakes Drill",
    purpose:
      "Build looseness under stakes by practising at progressively higher stakes.",
    problemItSolves:
      "Looseness trained only at low stakes vanishes when it matters; graded stakes fix it.",
    instructionsBody:
      "Practise staying loose while gradually raising the stakes — add a real audience, a recording that others will see, a consequence for the outcome. Each step trains you to keep your ease as the stakes climb toward the moments that matter most.",
    practiceFormat:
      "Across the week, run the same delivery at rising stakes (low → medium → high), keeping your looseness constant at each level.",
    whatToWatchFor:
      "Watch for tightening as stakes rise and mistaking that for inevitable. Only advance once you stay loose at the current level.",
    successStandard:
      "You stay loose and clear even at the highest stakes level you practise.",
    whenToUse:
      "Use when you're tightest in the moments that matter most. Looseness must be trained under real stakes to hold when it counts.",
    tags: ["high-stakes", "tension", "exposure", "composure", "resilience"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: low-stakes looseness. Weeks 2-3: raise the stakes. Week 4: looseness holds when it matters.",
  }),

  // ── Problem 32 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 32,
    problemTitle: "I Sound Different on Camera",
    exerciseIndex: 1,
    slug: "p32-e1-camera-as-friend",
    name: "Camera-as-Friend",
    purpose:
      "Reframe the camera as a friend so you speak naturally into it.",
    problemItSolves:
      "The lens feels like a cold judge, making you stiff; reframing it restores warmth.",
    instructionsBody:
      "Picture a specific friendly person behind the lens and speak directly to them. The camera stops being an impersonal eye and becomes a warm listener, which brings back your natural tone, expressions, and rhythm on camera.",
    practiceFormat:
      "Record 3 clips, each time picturing a real friend behind the lens and talking to them. Compare to a cold take and note the added warmth.",
    whatToWatchFor:
      "Watch for the friend image fading and the lens turning back into a judge. Keep the specific person vivid throughout.",
    successStandard:
      "You sound as warm and natural on camera as you do talking to a friend.",
    whenToUse:
      "Use when you sound different on camera. The lens feels evaluative and triggers performance mode; imagining a friend restores your natural voice.",
    tags: ["camera", "naturalness", "warmth", "authenticity", "presence"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: camera-as-friend reps. Weeks 2-3: use it for real recordings. Week 4: natural on camera by default.",
  }),
  seed({
    problemNumber: 32,
    problemTitle: "I Sound Different on Camera",
    exerciseIndex: 2,
    slug: "p32-e2-daily-recording-habit",
    name: "Daily Recording Habit",
    purpose:
      "Desensitise to the camera by recording yourself every single day.",
    problemItSolves:
      "The camera feels foreign because it's rare; daily use makes it familiar.",
    instructionsBody:
      "Record yourself speaking every day, even briefly. Familiarity removes the self-consciousness that makes you sound different on camera — the more ordinary recording becomes, the more your natural self shows up in front of the lens.",
    practiceFormat:
      "Record at least one short clip daily on any topic. Watch a few back with a coach's eye. Consistency matters more than length.",
    whatToWatchFor:
      "Watch for skipping days or only recording when you feel ready. The habit works through daily repetition regardless of mood.",
    successStandard:
      "The camera feels ordinary and your natural self shows up in recordings.",
    whenToUse:
      "Use when you sound different on camera. Unfamiliarity drives the stiffness; daily recording makes the camera normal.",
    tags: ["camera", "habit", "desensitization", "naturalness", "consistency"],
    timing: "10-15 minutes daily",
    timingMinutes: 12,
    timelineSummary:
      "Week 1: start the daily habit. Weeks 2-3: camera becomes routine. Week 4: natural self on camera.",
  }),

  // ── Problem 33 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 33,
    problemTitle: "I Struggle to Inspire",
    exerciseIndex: 1,
    slug: "p33-e1-why-before-the-what",
    name: "Why Before the What",
    purpose:
      "Lead with the why so your message moves people, not just informs them.",
    problemItSolves:
      "You state facts and plans without the purpose that makes people care.",
    instructionsBody:
      "Before the what and the how, state the why — the purpose, the stakes, the deeper reason it matters. People are moved by meaning, not mechanics, so opening with the why gives your message the emotional pull that inspires action.",
    practiceFormat:
      "Take 3 messages. For each, articulate the why first, then the what. Deliver aloud and compare to a why-less version for emotional impact.",
    whatToWatchFor:
      "Watch for a shallow why ('because it's important') or jumping to the what too fast. The why must carry genuine meaning.",
    successStandard:
      "Your messages open with a why that gives them emotional pull and inspires.",
    whenToUse:
      "Use when you struggle to inspire. Facts inform but don't move; leading with a genuine why gives your message the power to inspire.",
    tags: ["inspiration", "purpose", "why", "motivation", "impact"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: articulate the why first. Weeks 2-3: lead with why live. Week 4: purpose-led messages by default.",
  }),
  seed({
    problemNumber: 33,
    problemTitle: "I Struggle to Inspire",
    exerciseIndex: 2,
    slug: "p33-e2-story-to-truth-structure",
    name: "Story-to-Truth Structure",
    purpose:
      "Inspire by telling a story that lands a universal truth.",
    problemItSolves:
      "Abstract exhortations don't inspire; a story that reveals a truth does.",
    instructionsBody:
      "Tell a specific, concrete story, then draw out the universal truth it reveals. Stories move people emotionally and the truth gives them something to carry away — together they create the lift that pure statements can't achieve.",
    practiceFormat:
      "Take 3 truths you want to convey. For each, find a short story that reveals it and deliver story-then-truth aloud. Record and confirm the truth lands with feeling.",
    whatToWatchFor:
      "Watch for stories with no clear truth, or stating the truth without the story. Both halves are needed for the lift.",
    successStandard:
      "You can pair a concrete story with a universal truth so the message inspires.",
    whenToUse:
      "Use when you struggle to inspire. Story plus truth creates emotional lift that abstract statements can't.",
    tags: ["inspiration", "storytelling", "truth", "motivation", "impact"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: build story-to-truth pairs. Weeks 2-3: use them live. Week 4: inspiring storytelling by default.",
  }),

  // ── Problem 34 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 34,
    problemTitle: "I Can't Match the Level of the Room",
    exerciseIndex: 1,
    slug: "p34-e1-register-read-match",
    name: "Register-Read-Match",
    purpose:
      "Read the room's register and match your delivery to it.",
    problemItSolves:
      "You use one register regardless of the room, so you're mismatched to the moment.",
    instructionsBody:
      "Practise reading a room's energy and formality, then deliberately matching your register to it — more formal in a boardroom, looser in a casual huddle, higher energy in a rally. Matching the room makes you feel calibrated and credible rather than out of step.",
    practiceFormat:
      "Take 3 different room scenarios. For each, read the required register and deliver the same content matched to it. Record and confirm each fits its room.",
    whatToWatchFor:
      "Watch for defaulting to your habitual register regardless of the scenario, or over-shifting into caricature. Match, don't mimic.",
    successStandard:
      "You can read a room and adjust your register to fit it naturally.",
    whenToUse:
      "Use when you can't match the level of the room. A single fixed register clashes with different rooms; reading and matching keeps you calibrated.",
    tags: ["room-reading", "register", "adaptability", "calibration", "presence"],
    timing: "12-15 minutes daily",
    timingMinutes: 13,
    timelineSummary:
      "Week 1: practise matching different rooms. Weeks 2-3: apply live. Week 4: register-matching by default.",
  }),
  seed({
    problemNumber: 34,
    problemTitle: "I Can't Match the Level of the Room",
    exerciseIndex: 2,
    slug: "p34-e2-economy-of-language",
    name: "Economy of Language",
    purpose:
      "Match high-level rooms by saying more with fewer, sharper words.",
    problemItSolves:
      "In senior rooms, over-talking signals you don't belong; economy signals you do.",
    instructionsBody:
      "Practise conveying your point in the fewest, sharpest words possible. Senior rooms run on economy — the higher the level, the less padding is tolerated. Trimming to essentials matches the concision that high-level rooms expect and respect.",
    practiceFormat:
      "Take 5 points. Deliver each in the fewest words that still land it fully. Record and cut any word that isn't earning its place.",
    whatToWatchFor:
      "Watch for cutting so hard the point becomes cryptic, or leaving in comfort padding. Sharp and complete, not terse or bloated.",
    successStandard:
      "You can deliver points with the tight economy that high-level rooms expect.",
    whenToUse:
      "Use when you can't match the level of the room. High-level rooms reward economy; trimming to essentials matches their expectations.",
    tags: ["room-reading", "economy", "concision", "calibration", "authority"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: economy reps daily. Weeks 2-3: apply in senior settings. Week 4: sharp economy by default.",
  }),

  // ── Problem 35 ─────────────────────────────────────────────────────────────
  seed({
    problemNumber: 35,
    problemTitle: "I Know My Stuff But Don't Sound Like It",
    exerciseIndex: 1,
    slug: "p35-e1-hedging-audit",
    name: "Hedging Audit",
    purpose:
      "Audit and remove the hedging that makes expertise sound uncertain.",
    problemItSolves:
      "Hedging language makes your real expertise sound tentative and unconvincing.",
    instructionsBody:
      "Record yourself and audit for hedges — 'I think', 'maybe', 'sort of', 'I'm not sure but'. Each one signals doubt you don't actually feel. Redeliver, removing the hedges, so your language finally matches the expertise you have.",
    practiceFormat:
      "Record a daily answer in your area. Audit and count the hedges, then redo it hedge-free. Track the count dropping across the week.",
    whatToWatchFor:
      "Watch for hedges you don't hear yourself using, and for replacing hedges with new ones. Record to catch them all.",
    successStandard:
      "Your expert answers are hedge-free and sound as authoritative as your knowledge is.",
    whenToUse:
      "Use when you know your stuff but don't sound like it. Reflexive hedging undercuts real expertise; auditing it out closes the gap.",
    tags: ["expertise", "hedging", "authority", "confidence", "credibility"],
    timing: "10 minutes daily",
    timingMinutes: 10,
    timelineSummary:
      "Week 1: audit and cut hedges. Weeks 2-3: catch them live. Week 4: hedge-free expert delivery.",
  }),
  seed({
    problemNumber: 35,
    problemTitle: "I Know My Stuff But Don't Sound Like It",
    exerciseIndex: 2,
    slug: "p35-e2-expertise-opening-drill",
    name: "Expertise Opening Drill",
    purpose:
      "Open with a line that frames you as the expert from the first sentence.",
    problemItSolves:
      "A tentative open undercuts your expertise before the content proves it.",
    instructionsBody:
      "Practise opening with a confident, expert-framing line — a clear claim, a definitive frame, a direct answer — so you sound like the authority from word one. The strong open sets a frame the listener carries through the rest of what you say.",
    practiceFormat:
      "Write and drill 8-10 expert opening lines for topics you know well. Deliver each cold, then continue into a full answer. Record and confirm the open reads as authority.",
    whatToWatchFor:
      "Watch for openings that are worded confidently but delivered tentatively. The line and the voice must both project expertise.",
    successStandard:
      "You open with lines that establish your expertise from the first sentence.",
    whenToUse:
      "Use when you know your stuff but don't sound like it. A tentative open frames you as unsure; a strong expert open frames you as the authority you are.",
    tags: ["expertise", "opening", "authority", "confidence", "framing"],
    timing: "10-12 minutes daily",
    timingMinutes: 11,
    timelineSummary:
      "Week 1: build expert opens. Weeks 2-3: deploy them live. Week 4: authoritative opens by default.",
  }),
];

export function problemBibleBySlug(
  slug: string,
): ProblemBibleExerciseSeed | undefined {
  return PROBLEM_BIBLE_EXERCISES.find((ex) => ex.slug === slug);
}
