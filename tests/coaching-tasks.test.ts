import { describe, expect, it } from "vitest";

import { isTaskFinished } from "@/lib/coaching-tasks";

describe("coaching task completion semantics", () => {
  it("treats legacy submitted audio tasks as completed", () => {
    expect(isTaskFinished("submitted")).toBe(true);
  });

  it("keeps open tasks incomplete", () => {
    expect(isTaskFinished("open")).toBe(false);
  });
});
