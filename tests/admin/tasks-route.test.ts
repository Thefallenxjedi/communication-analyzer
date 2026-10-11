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
  setCoachingTaskCoachComment,
  updateCoachingTask,
  captureClientActivity,
  getCoachingClient,
} = vi.hoisted(() => ({
  requireStaffConvex: vi.fn(),
  listCoachingSessions: vi.fn(),
  completeCoachingTask: vi.fn(),
  createCoachingTask: vi.fn(),
  getCoachingTask: vi.fn(),
  listCoachingTasks: vi.fn(),
  markCoachingTaskReviewed: vi.fn(),
  removeCoachingTask: vi.fn(),
  setCoachingTaskCoachComment: vi.fn(),
  updateCoachingTask: vi.fn(),
  captureClientActivity: vi.fn(),
  getCoachingClient: vi.fn(),
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
  setCoachingTaskCoachComment,
  updateCoachingTask,
}));

vi.mock("@/lib/coaching-clients", () => ({
  getCoachingClient,
}));

vi.mock("@/lib/posthog-client-activity", () => ({
  captureClientActivity,
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
    setCoachingTaskCoachComment.mockResolvedValue({ ok: true });
    removeCoachingTask.mockResolvedValue({ ok: true });
    listCoachingTasks.mockResolvedValue([{ id: "task-1", title: "Task 1" }]);
    listCoachingSessions.mockResolvedValue([{ sessionNumber: 1, ready: true }]);
    getCoachingClient.mockResolvedValue({
      id: "client-1",
      name: "Anuradha",
      email: "anuradha@example.com",
    });
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
    expect(captureClientActivity).toHaveBeenCalledWith({
      distinctId: "client-1",
      event: "coaching_task_assigned",
      properties: {
        session_number: 2,
        session_label: "Session 2",
        recording_required: true,
        task_title: "Task 1",
        task_summary: "Do the work",
      },
      person: {
        email: "anuradha@example.com",
        name: "Anuradha",
        role: "client",
      },
    });
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

  it("saves an optional coach comment without changing completion", async () => {
    const res = await PATCH(
      new Request("https://example.com/api/admin/tasks", {
        method: "PATCH",
        body: JSON.stringify({
          id: "task-1",
          clientId: "client-1",
          coachComment: "Strong pacing. Keep the final pause.",
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(setCoachingTaskCoachComment).toHaveBeenCalledWith(
      {
        id: "task-1",
        comment: "Strong pacing. Keep the final pause.",
      },
      convex,
    );
    expect(markCoachingTaskReviewed).not.toHaveBeenCalled();
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
