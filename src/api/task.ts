import api from "./axios";

export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "BLOCKED"
  | "COMPLETED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface TaskUser {
  _id: string;
  name: string;
  email: string;
}
export interface TaskDependency {
  _id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
}

export interface Task {
  _id: string;
  project: string;
  title: string;
  description?: string;
  assignee?: TaskUser;
  reporter?: TaskUser;
  status: TaskStatus;
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  labels: string[];
  estimate?: number;
  order: number;
  version: number;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
  dependencies?: TaskDependency[];
}

export interface CreateTaskData {
  title: string;
  description?: string;
  assignee?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  startDate?: string;
  dueDate?: string;
  labels?: string[];
  estimate?: number;
}

export interface TaskFilters {
  search?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  label?: string;
  overdue?: boolean;
  creator?: string;
  startDate?: string;
  dueDate?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface TaskPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface TaskListResponse {
  tasks: Task[];
  pagination: TaskPagination;
}

export const getTasks = async (
  projectId: string,
  filters: TaskFilters = {},
): Promise<TaskListResponse> => {
  const response = await api.get(`/tasks/project/${projectId}`, {
    params: filters,
  });

  return response.data.data;
};

export const getCalendarTasks = async (
  projectId: string,
  start: string,
  end: string,
) => {
  const response = await api.get(`/tasks/project/${projectId}/calendar`, {
    params: {
      start,
      end,
    },
  });

  return response.data.data.tasks;
};
export const getTimelineTasks = async (
  projectId: string,
  start: string,
  end: string,
) => {
  const response = await api.get(`/tasks/project/${projectId}/timeline`, {
    params: {
      start,
      end,
    },
  });

  return response.data.data.tasks;
};

export const createTask = async (projectId: string, data: CreateTaskData) => {
  const response = await api.post(`/tasks/project/${projectId}`, data);

  return response.data.data.task;
};

export const updateTask = async (
  taskId: string,
  data: Partial<CreateTaskData> & {
    version: number;
  },
) => {
  const response = await api.patch(`/tasks/${taskId}`, data);

  return response.data.data.task;
};

export const moveTask = async (
  taskId: string,
  data: {
    status: TaskStatus;
    order: number;
    version: number;
  },
) => {
  const response = await api.patch(`/tasks/${taskId}/move`, data);

  return response.data.data.task;
};

export const archiveTask = async (taskId: string, version: number) => {
  const response = await api.patch(`/tasks/${taskId}/archive`, {
    version,
  });

  return response.data.data.task;
};

export interface BulkTaskUpdate {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
}

export interface BulkTaskItem {
  id: string;
  version: number;
}

export interface BulkUpdateResponse {
  successful: Task[];
  failed: {
    id: string;
    reason: string;
  }[];
}

export const bulkUpdateTasks = async (
  tasks: BulkTaskItem[],
  updates: BulkTaskUpdate,
): Promise<BulkUpdateResponse> => {
  const response = await api.patch("/tasks/bulk", {
    tasks,
    updates,
  });

  return response.data.data;
};

export const getArchivedTasks = async (projectId: string) => {
  const response = await api.get(`/tasks/project/${projectId}/archived`);

  return response.data.data.tasks;
};

export const restoreTask = async (taskId: string) => {
  const response = await api.patch(`/tasks/${taskId}/restore`);

  return response.data.data.task;
};

export const deleteTask = async (taskId: string) => {
  const response = await api.delete(`/tasks/${taskId}`);

  return response.data;
};