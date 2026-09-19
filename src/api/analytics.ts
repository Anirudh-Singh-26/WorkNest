import api from "./axios";

export interface AnalyticsSummary {
  totalTasks: number;
  completedTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  completionPercentage: number;
}

export interface AnalyticsBreakdown {
  _id: string;
  count: number;
}

export interface AnalyticsWorkload {
  userId: string;
  name: string;
  email: string;
  taskCount: number;
}

export interface AnalyticsDatePoint {
  _id: string;
  count: number;
}

export interface ProjectAnalytics {
  summary: AnalyticsSummary;
  statusBreakdown: AnalyticsBreakdown[];
  priorityBreakdown: AnalyticsBreakdown[];
  workload: AnalyticsWorkload[];
  createdByDate: AnalyticsDatePoint[];
  completedByDate: AnalyticsDatePoint[];
}

export const getProjectAnalytics = async (
  projectId: string,
  start?: string,
  end?: string,
): Promise<ProjectAnalytics> => {
  const response = await api.get(`/analytics/project/${projectId}`, {
    params: {
      start,
      end,
    },
  });

  return response.data.data;
};
