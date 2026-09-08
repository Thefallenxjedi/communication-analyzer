import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getActiveClientSession,
  getAuthedConvexClient,
  ensureCoachingProgram,
  listCoachingTasks,
  listCoachingSessions,
  completeCoachingTask,
  submitCoachingTask,
} = vi.hoisted(() => ({
  getActiveClientSession: vi.fn(),
  getAuthedConvexClient: vi.fn(),
  ensureCoachingProgram: vi.fn(),
  listCoachingTasks: vi.fn(),
  listCoachingSessions: vi.fn(),
  completeCoachingTask: vi.fn(),
  submitCoachingTask: vi.fn(),
}));

vi.mock("@/lib/client-auth", () => ({
  getActiveClientSession,
  getAuthedConvexClient,
}));
vi.mock("@/lib/coaching-tasks", () => ({
  ensureCoachingProgram,
  listCoachingTasks,
  completeCoachingTask,
  reviseCoachingTask: vi.fn(),
  submitCoachingTask,
  usesVideoLink: () => false,
}));
vi.mock("@/lib/coaching-sessions", () => ({
  listCoachingSessions,
  sessionsForClientView: (sessions: unknown[]) => sessions,
}));
vi.mock("@/lib/convex-server", () => ({
  isConvexConfigured: () => true,
  formatConvexError: (err: unknown) =>
    err instanceof Error ? err.message : "Unknown error",
}));

import { GET, POST } from "@/app/api/client/workouts/route";

const convex = { tag: "convex" };
const futureTask = {
  id: "task-future",
  clientId: "client-1",
  sessionNumber: 5,
  title: "Future assigned task",
  instructions: "Practice this.",
  recordingRequired: false,
  status: "open",
};

describe("/api/client/workouts", () => {
  beforeEach(() => {
    getActiveClientSession.mockResolvedValue({
      client: {
        id: "client-1",
        currentStage: "Session 2",
        workSessionCount: 9,
      },
    });
    getAuthedConvexClient.mockResolvedValue(convex);
    ensureCoachingProgram.mockResolvedValue({ ok: true });
    listCoachingTasks.mockResolvedValue([futureTask]);
    listCoachingSessions.mockResolvedValue([]);
    completeCoachingTask.mockResolvedValue({ ok: true });
    submitCoachingTask.mockResolvedValue({ ok: true });
  });

  it("returns every task the admin has assigned, including future sessions", async () => {
    const res = await GET();

    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tasks: [futureTask] });
  });

  it("allows a client to complete an assigned future non-audio task", async () => {
    const res = await POST(
      new Request("https://example.com/api/client/workouts", {
        method: "POST",
        body: JSON.stringify({ id: "task-future", complete: true }),
      }),
    );

    expect(res.status).toBe(200);
    expect(completeCoachingTask).toHaveBeenCalledWith("task-future", convex);
  });

  it("submits an audio task directly into the completed workflow", async () => {
    const audioTask = {
      ...futureTask,
      id: "task-audio",
      recordingRequired: true,
    };
    listCoachingTasks.mockResolvedValue([audioTask]);

    const res = await POST(
      new Request("https://example.com/api/client/workouts", {
        method: "POST",
        body: JSON.stringify({
          id: "task-audio",
          storageId: "storage-1",
          durationSec: 47,
        }),
      }),
    );

    expect(res.status).toBe(200);
    expect(submitCoachingTask).toHaveBeenCalledWith(
      {
        id: "task-audio",
        storageId: "storage-1",
        driveUrl: undefined,
        durationSec: 47,
        responseText: undefined,
      },
      convex,
    );
  });
});
