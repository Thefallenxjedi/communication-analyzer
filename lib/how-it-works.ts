export type HowItWorksTask = {
  title: string;
  note?: string;
};

export type HowItWorksWeek = {
  number: number;
  title: string;
  lines: string[];
  tasks: HowItWorksTask[];
};

export const HOW_IT_WORKS_WEEKS: HowItWorksWeek[] = [
  {
    number: 1,
    title: "Orientation, Commitment & Clarity of Thought",
    lines: ["Orientation,", "Commitment & Clarity", "of Thought"],
    tasks: [
      { title: "A Warning" },
      { title: "Why Clients Don't See a Transformation" },
      { title: "Verbal Brand Authoring Call", note: "15 mins" },
      { title: "The Dial", note: "Flow vs. Framework" },
      { title: "Articulating the Perfect Thought" },
      { title: "The Power Law of Clarity" },
      { title: "Accelerating Clarity Through Curiosity" },
      { title: "Rapid Mental Organization", note: "RMO" },
    ],
  },
  {
    number: 2,
    title: "Comfort with Self",
    lines: ["Comfort", "with Self"],
    tasks: [
      { title: "Destroying Care", note: "Shadow Target & Flame-List" },
      { title: "Designing a Pre-Speaking Ritual" },
      { title: "Comfort with Silence" },
      { title: "Vocal Archetypes", note: "Radiant / Sage / Caregiver" },
      { title: "Challenge Lab", note: "30 mins" },
    ],
  },
  {
    number: 3,
    title: "Texture & Articulacy",
    lines: ["Texture &", "Articulacy"],
    tasks: [
      { title: "Intro to Verbal Branding", note: "Surface vs. Deep Lexicon" },
      { title: "Resonant Word-Mining & Commonplace-Book + Vocab App" },
      { title: "Sentence-Engineering", note: "Beginnings/Endings, Connectors, BPMs" },
      { title: "Group Session Break-Outs", note: "20 mins" },
    ],
  },
  {
    number: 4,
    title: "Texture & Articulacy Continued",
    lines: ["Texture & Articulacy", "Continued"],
    tasks: [
      { title: "Epic Quote Building" },
      { title: "Razor-Sharp Articulacy", note: "Surprise & Sharpen" },
      { title: "Get Wet with Emotions", note: "Emotional Wheel & Saying" },
      { title: "Moderation Call", note: "with peers" },
    ],
  },
  {
    number: 5,
    title: "Reps & Reviews",
    lines: ["Reps &", "Reviews"],
    tasks: [
      { title: "Daily Workout" },
      { title: "Coach Check-in" },
    ],
  },
  {
    number: 6,
    title: "Reps & Reviews",
    lines: ["Reps &", "Reviews"],
    tasks: [
      { title: "Daily Workout" },
      { title: "Coach Check-in" },
    ],
  },
  {
    number: 7,
    title: "Reps & Reviews",
    lines: ["Reps &", "Reviews"],
    tasks: [
      { title: "Daily Workout" },
      { title: "Coach Check-in" },
    ],
  },
  {
    number: 8,
    title: "Capstone & Next Steps",
    lines: ["Capstone &", "Next Steps"],
    tasks: [
      { title: "Daily Workout" },
      { title: "Coach Check-in" },
      { title: "Conclusion Coaching Call", note: "with Josh" },
    ],
  },
];

export const HOW_IT_WORKS_WEEK_COUNT = HOW_IT_WORKS_WEEKS.length;

export function padWeek(n: number): string {
  return String(n).padStart(2, "0");
}
