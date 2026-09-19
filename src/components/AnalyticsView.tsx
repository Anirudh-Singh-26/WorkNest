import type { ProjectAnalytics } from "../api/analytics";

interface AnalyticsViewProps {
  analytics: ProjectAnalytics | null;
  loading: boolean;
}

const AnalyticsView = ({ analytics, loading }: AnalyticsViewProps) => {
  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <p className="text-sm text-slate-500">Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-center">
        <p className="text-sm text-slate-500">No analytics available.</p>
      </div>
    );
  }

  const { summary, statusBreakdown, priorityBreakdown, workload } = analytics;

  return (
    <div className="space-y-5">
      {/* Summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Total Tasks</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {summary.totalTasks}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Completed</p>
          <p className="mt-2 text-2xl font-bold text-green-600">
            {summary.completedTasks}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Blocked</p>
          <p className="mt-2 text-2xl font-bold text-red-600">
            {summary.blockedTasks}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Overdue</p>
          <p className="mt-2 text-2xl font-bold text-orange-600">
            {summary.overdueTasks}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <p className="text-sm text-slate-500">Completion</p>
          <p className="mt-2 text-2xl font-bold text-indigo-600">
            {summary.completionPercentage}%
          </p>
        </div>
      </div>

      {/* Status + Priority */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Tasks by Status</h3>

          <div className="mt-4 space-y-3">
            {statusBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500">No data available.</p>
            ) : (
              statusBreakdown.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-slate-600">
                    {item._id.replace("_", " ")}
                  </span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {item.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Tasks by Priority</h3>

          <div className="mt-4 space-y-3">
            {priorityBreakdown.length === 0 ? (
              <p className="text-sm text-slate-500">No data available.</p>
            ) : (
              priorityBreakdown.map((item) => (
                <div
                  key={item._id}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm text-slate-600">{item._id}</span>

                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                    {item.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Workload */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <h3 className="font-semibold text-slate-900">Team Workload</h3>

        <div className="mt-4 space-y-3">
          {workload.length === 0 ? (
            <p className="text-sm text-slate-500">No assigned tasks.</p>
          ) : (
            workload.map((member) => (
              <div
                key={member.userId}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {member.name}
                  </p>

                  <p className="text-xs text-slate-500">{member.email}</p>
                </div>

                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-600">
                  {member.taskCount} tasks
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Created / Completed */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Tasks Created</h3>

          <div className="mt-4 space-y-2">
            {analytics.createdByDate.map((item) => (
              <div key={item._id} className="flex justify-between text-sm">
                <span className="text-slate-500">{item._id}</span>

                <span className="font-medium text-slate-800">{item.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h3 className="font-semibold text-slate-900">Tasks Completed</h3>

          <div className="mt-4 space-y-2">
            {analytics.completedByDate.map((item) => (
              <div key={item._id} className="flex justify-between text-sm">
                <span className="text-slate-500">{item._id}</span>

                <span className="font-medium text-slate-800">{item.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
