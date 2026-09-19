import { useCallback, useEffect, useState } from "react";
import { getProjects } from "../api/project";
import { getProjectAnalytics } from "../api/analytics";
import { getTasks, type Task } from "../api/task";
import { useWorkspace } from "../context/WorkspaceContext";
import { socket } from "../socket/socket";

const DashboardPage = () => {
  const { currentWorkspace, loading: workspaceLoading } = useWorkspace();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [totalTasks, setTotalTasks] = useState(0);
  const [completedTasks, setCompletedTasks] = useState(0);
  const [inProgressTasks, setInProgressTasks] = useState(0);
  const [overdueTasks, setOverdueTasks] = useState(0);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);

  const loadDashboard = useCallback(async () => {
    if (!currentWorkspace) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const projects = await getProjects(currentWorkspace._id);

      if (projects.length === 0) {
        setTotalTasks(0);
        setCompletedTasks(0);
        setInProgressTasks(0);
        setOverdueTasks(0);
        setRecentTasks([]);
        return;
      }

      const analyticsResults = await Promise.all(
        projects.map((project: { _id: string }) =>
          getProjectAnalytics(project._id).catch(() => null),
        ),
      );

      let total = 0;
      let completed = 0;
      let inProgress = 0;
      let overdue = 0;

      analyticsResults.forEach((analytics) => {
        if (!analytics) return;

        total += analytics.summary.totalTasks;
        completed += analytics.summary.completedTasks;
        overdue += analytics.summary.overdueTasks;

        const inProgressBreakdown = analytics.statusBreakdown.find(
          (item: { _id: string }) => item._id === "IN_PROGRESS",
        );

        inProgress += inProgressBreakdown?.count || 0;
      });

      setTotalTasks(total);
      setCompletedTasks(completed);
      setInProgressTasks(inProgress);
      setOverdueTasks(overdue);

      const taskResults = await Promise.all(
        projects.map((project: { _id: string }) =>
          getTasks(project._id, {
            page: 1,
            limit: 5,
            sortBy: "createdAt",
            sortOrder: "desc",
          }).catch(() => null),
        ),
      );

      const allRecentTasks = taskResults
        .filter((result) => result !== null)
        .flatMap((result) => result.tasks);

      allRecentTasks.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

      setRecentTasks(allRecentTasks.slice(0, 5));
    } catch (error: any) {
      console.error("Failed to load dashboard", error);

      setError(
        error.response?.data?.message || "Failed to load dashboard data",
      );
    } finally {
      setLoading(false);
    }
  }, [currentWorkspace]);

  useEffect(() => {
    if (!workspaceLoading) {
      loadDashboard();
    }
  }, [workspaceLoading, loadDashboard]);

  useEffect(() => {
    if (!currentWorkspace) {
      return;
    }

    const refreshDashboard = () => {
      loadDashboard();
    };

    socket.on("task.created", refreshDashboard);
    socket.on("task.updated", refreshDashboard);
    socket.on("task.moved", refreshDashboard);
    socket.on("task.archived", refreshDashboard);
    socket.on("task.restored", refreshDashboard);

    return () => {
      socket.off("task.created", refreshDashboard);
      socket.off("task.updated", refreshDashboard);
      socket.off("task.moved", refreshDashboard);
      socket.off("task.archived", refreshDashboard);
      socket.off("task.restored", refreshDashboard);
    };
  }, [currentWorkspace, loadDashboard]);

  if (workspaceLoading || loading) {
    return (
      <div className="flex min-h-[360px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />

          <p className="mt-3 text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="w-full p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <h1 className="text-xl font-semibold text-slate-900">
            No workspace selected
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Select or create a workspace to view dashboard data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full p-6">
      {/* Page Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>

        <p className="mt-1 text-sm text-slate-500">
          Overview of tasks across {currentWorkspace.name}
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>

          <button
            type="button"
            onClick={loadDashboard}
            className="text-sm font-medium text-red-700 transition hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Total Tasks</p>

          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {totalTasks}
          </p>

          <p className="mt-1 text-xs text-slate-400">Across all projects</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Completed</p>

          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {completedTasks}
          </p>

          <p className="mt-1 text-xs text-slate-400">Finished tasks</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">In Progress</p>

          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {inProgressTasks}
          </p>

          <p className="mt-1 text-xs text-slate-400">Currently active</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm font-medium text-slate-500">Overdue</p>

          <p className="mt-3 text-3xl font-semibold text-slate-900">
            {overdueTasks}
          </p>

          <p className="mt-1 text-xs text-slate-400">Past due date</p>
        </div>
      </div>

      {/* Recent Tasks */}
      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-5">
          <h2 className="text-base font-semibold text-slate-900">
            Recent Tasks
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Recently created tasks across your workspace.
          </p>
        </div>

        {recentTasks.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <h3 className="text-sm font-medium text-slate-700">
              No tasks found
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              Create a task inside a project to see it here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTasks.map((task) => (
              <div
                key={task._id}
                className="flex items-center justify-between gap-4 px-5 py-4 transition hover:bg-slate-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {task.title}
                  </p>

                  <div className="mt-1.5 flex items-center gap-2 text-xs">
                    <span className="text-slate-500">
                      {task.status.replace("_", " ")}
                    </span>

                    <span className="text-slate-300">•</span>

                    <span className="text-slate-500">{task.priority}</span>
                  </div>
                </div>

                <span className="shrink-0 text-xs text-slate-400">
                  {new Date(task.createdAt).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
