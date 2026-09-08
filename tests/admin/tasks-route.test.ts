import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requireStaffConvex,
  listCoachingSessions,
  completeCoachingTask,
  createCoachingTask,
  getCoachingTask,
  listCoachingTasks,
  markCoachingTaskReviewed,
  removeCoachingTask,
  updateCoachingTask,
} = vi.hoisted(() => ({
  requireStaffConvex: vi.fn(),
  listCoachingSessions: vi.fn(),
  completeCoachingTask: vi.fn(),
  createCoachingTask: vi.fn(),
  getCoachingTask: vi.fn(),
  listCoachingTasks: vi.fn(),
  markCoachingTaskReviewed: vi.fn(),
  removeCoachingTask: vi.fn(),
  updateCoachingTask: vi.fn(),
}));

vi.mock("@/lib/staff-auth", () => ({
  requireStaffConvex,
}));

vi.mock("@/lib/coaching-sessions", () => ({
  listCoachingSessions,
}));

vi.mock("@/lib/coaching-tasks", () => ({
  completeCoachingTask,
  createCoachingTask,
  getCoachingTask,
  listCoachingTasks,
  markCoachingTaskReviewed,
  needsCoachReview: (task: { recordingRequired?: boolean }) =>
    task.recordingRequired === true,
  removeCoachingTask,
  updateCoachingTask,
}));

vi.mock("@/lib/convex-server", () => ({
  formatConvexError: (err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
}));

import {
  DELETE,
  PATCH,
  POST,
} from "@/app/api/admin/tasks/route";

const convex = { tag: "convex" };

describe("/api/admin/tasks", () => {
  beforeEach(() => {
    requireStaffConvex.mockResolvedValue(convex);
    createCoachingTask.mockResolvedValue({ ok: true, id: "task-1" });
    updateCoachingTask.mockResolvedValue({ ok: true });
    completeCoachingTask.mockResolvedValue({ ok: true });
    markCoachingTaskReviewed.mockResolvedValue({ ok: true });
    removeCoachingTask.mockResolvedValue({ ok: true });
    listCoachingTasks.mockResolvedValue([{ id: "task-1", title: "Task 1" }]);
    listCoachingSessions.mockResolvedValue([{ sessionNumber: 1, ready: true }]);
    getCoachingTask.mockResolvedValue({
      id: "task-1",
      recordingRequired: true,
    });
  });

  it("creates a task and returns refreshed tasks and sessions", async () => {
    const res = await POST(
      new Request("https://example.com/api/admin/tasks", {
        method: "POST",
        body: JSON.stringify({
          clientId: "client-1",
          sessionNumber: 2,
          title: "Task 1",
          instructions: "Do the work",
          recordingRequired: true,
          expectedMinutes: 10,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(createCoachingTask).toHaveBeenCalledWith(
      {
        clientId: "client-1",
        sessionNumber: 2,
        title: "Task 1",
        instructions: "Do the work",
        recordingRequired: true,
        expectedMinutes: 10,
      },
      convex,
    );
  });

  it("marks a submitted task reviewed", async () => {
    const res = await PATCH(
      new Request("https://example.com/api/admin/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          id: "task-1",
          clientId: "client-1",
          markReviewed: true,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(markCoachingTaskReviewed).toHaveBeenCalledWith("task-1", convex);
  });

  it("allows admin completion only for audio-review tasks", async () => {
    const res = await PATCH(
      new Request("https://example.com/api/admin/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          id: "task-1",
          clientId: "client-1",
          complete: true,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(getCoachingTask).toHaveBeenCalledWith("task-1", convex);
    expect(completeCoachingTask).toHaveBeenCalledWith("task-1", convex);
  });

  it("deletes a task", async () => {
    const res = await DELETE(
      new Request(
        "https://example.com/api/admin/tasks?id=task-1&clientId=client-1",
        { method: "DELETE" },
      ),
    );

    expect(res.status).toBe(200);
    expect(removeCoachingTask).toHaveBeenCalledWith("task-1", convex);
  });
});
