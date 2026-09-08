import { describe, expect, it } from "vitest";
import {
  INTRO_SESSION,
  groupedProgramSession,
  parseCurrentStage,
  sessionLabel,
} from "@/lib/coaching-program";

describe("grouped Intro Call and Session 1 presentation", () => {
  it("uses the combined display label without changing stored session ids", () => {
    expect(sessionLabel(INTRO_SESSION)).toBe("Intro Call + Session 1");
    expect(sessionLabel(1)).toBe("Session 1");
    expect(groupedProgramSession(INTRO_SESSION)).toBe(INTRO_SESSION);
    expect(groupedProgramSession(1)).toBe(INTRO_SESSION);
    expect(groupedProgramSession(2)).toBe(2);
  });

  it("continues parsing legacy and combined current-stage labels", () => {
    expect(parseCurrentStage("Intro Call")).toBe(INTRO_SESSION);
    expect(parseCurrentStage("Intro Call + Session 1")).toBe(INTRO_SESSION);
    expect(parseCurrentStage("Session 1")).toBe(1);
  });
});
