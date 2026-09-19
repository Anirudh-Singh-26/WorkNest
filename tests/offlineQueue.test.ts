import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createComment: vi.fn(),
  updateTask: vi.fn(),
}));

vi.mock("../src/api/comment", () => ({
  createComment: mocks.createComment,
}));

vi.mock("../src/api/task", () => ({
  updateTask: mocks.updateTask,
}));

import {
  enqueueOfflineOperation,
  getOfflineQueue,
  syncOfflineQueue,
} from "../src/utils/offlineQueue";

describe("offlineQueue", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.createComment.mockReset();
    mocks.updateTask.mockReset();
  });

  it("adds a task update to the queue", () => {
    enqueueOfflineOperation({
      type: "TASK_UPDATE",
      projectId: "project1",
      taskId: "task1",
      payload: {
        status: "IN_PROGRESS",
      },
    });

    const queue = getOfflineQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].type).toBe("TASK_UPDATE");
    expect(queue[0].taskId).toBe("task1");
    expect(queue[0].status).toBe("pending");
  });

  it("prevents duplicate pending task updates for the same task", () => {
    enqueueOfflineOperation({
      type: "TASK_UPDATE",
      projectId: "project1",
      taskId: "task1",
      payload: {
        status: "IN_PROGRESS",
      },
    });

    enqueueOfflineOperation({
      type: "TASK_UPDATE",
      projectId: "project1",
      taskId: "task1",
      payload: {
        status: "COMPLETED",
      },
    });

    const queue = getOfflineQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].payload.status).toBe("COMPLETED");
  });

  it("syncs a queued task update successfully", async () => {
    mocks.updateTask.mockResolvedValue({});

    enqueueOfflineOperation({
      type: "TASK_UPDATE",
      projectId: "project1",
      taskId: "task1",
      payload: {
        status: "COMPLETED",
      },
    });

    await syncOfflineQueue();

    expect(mocks.updateTask).toHaveBeenCalledWith("task1", {
      status: "COMPLETED",
    });

    expect(getOfflineQueue()).toHaveLength(0);
  });

  it("keeps a failed operation in the queue", async () => {
    mocks.updateTask.mockRejectedValue(new Error("Network error"));

    enqueueOfflineOperation({
      type: "TASK_UPDATE",
      projectId: "project1",
      taskId: "task1",
      payload: {
        status: "COMPLETED",
      },
    });

    await syncOfflineQueue();

    const queue = getOfflineQueue();

    expect(queue).toHaveLength(1);
    expect(queue[0].status).toBe("failed");
    expect(queue[0].error).toBe("Network error");
  });

});
