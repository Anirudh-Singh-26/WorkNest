import { createComment } from "../api/comment";
import { updateTask } from "../api/task";

export type OfflineOperationType = "TASK_UPDATE" | "COMMENT_CREATE";

export type OfflineOperationStatus = "pending" | "syncing" | "failed";

export interface OfflineOperation {
  id: string;
  type: OfflineOperationType;
  status: OfflineOperationStatus;
  projectId: string;
  taskId: string;
  payload: Record<string, any>;
  createdAt: string;
  error?: string;
}

const STORAGE_KEY = "fixl_offline_queue";

const createId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

export const getOfflineQueue = (): OfflineOperation[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return [];
    }

    return JSON.parse(stored);
  } catch {
    return [];
  }
};

const saveOfflineQueue = (queue: OfflineOperation[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

export const enqueueOfflineOperation = (
  operation: Omit<OfflineOperation, "id" | "status" | "createdAt">,
) => {
  const queue = getOfflineQueue();


  if (operation.type === "TASK_UPDATE") {
    const filteredQueue = queue.filter(
      (item) =>
        !(
          item.type === "TASK_UPDATE" &&
          item.taskId === operation.taskId &&
          (item.status === "pending" || item.status === "failed")
        ),
    );

    const newOperation: OfflineOperation = {
      ...operation,
      id: createId(),
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    saveOfflineQueue([...filteredQueue, newOperation]);

    return newOperation;
  }

  const newOperation: OfflineOperation = {
    ...operation,
    id: createId(),
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  saveOfflineQueue([...queue, newOperation]);

  return newOperation;
};

const getErrorMessage = (error: any) => {
  if (error?.response?.status === 409) {
    return "Conflict: this task was updated by another user.";
  }

  return error?.response?.data?.message || error?.message || "Sync failed";
};

export const syncOfflineQueue = async () => {
  let queue = getOfflineQueue();

  for (const operation of queue) {
    if (operation.status !== "pending") {
      continue;
    }

    queue = queue.map((item) =>
      item.id === operation.id
        ? {
            ...item,
            status: "syncing",
            error: undefined,
          }
        : item,
    );

    saveOfflineQueue(queue);

    try {
      if (operation.type === "TASK_UPDATE") {
        await updateTask(
          operation.taskId,
          operation.payload as Parameters<typeof updateTask>[1],
        );
      }

      if (operation.type === "COMMENT_CREATE") {
        await createComment(operation.taskId, operation.payload.body);
      }

      queue = queue.filter((item) => item.id !== operation.id);

      saveOfflineQueue(queue);
    } catch (error: any) {
      queue = queue.map((item) =>
        item.id === operation.id
          ? {
              ...item,
              status: "failed",
              error: getErrorMessage(error),
            }
          : item,
      );

      saveOfflineQueue(queue);
    }
  }

  return queue;
};

export const retryOfflineOperation = (operationId: string) => {
  const queue = getOfflineQueue();

  const updatedQueue = queue.map((item) =>
    item.id === operationId
      ? {
          ...item,
          status: "pending" as const,
          error: undefined,
        }
      : item,
  );

  saveOfflineQueue(updatedQueue);

  return updatedQueue;
};
