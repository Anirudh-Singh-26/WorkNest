import { useSocket } from "../context/SocketContext";

const NotificationsPage = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useSocket();

  const formatTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();

    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);

    if (days < 7) return `${days}d ago`;

    return new Date(date).toLocaleDateString();
  };

  const getNotificationLabel = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return "Task assigned";

      case "TASK_MENTION":
        return "Mention";

      case "COMMENT":
        return "Comment";

      case "DUE_DATE":
        return "Due date";

      case "STATUS_CHANGE":
        return "Status changed";

      case "MEMBERSHIP":
        return "Workspace update";

      default:
        return "Notification";
    }
  };

  return (
    <div className="w-full p-6">
      {/* Header */}
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>

          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Notifications
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            {unreadCount > 0
              ? `${unreadCount} unread notification${
                  unreadCount === 1 ? "" : "s"
                }`
              : "You're all caught up"}
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="shrink-0 rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {notifications.length === 0 ? (
          <div className="px-5 py-14 text-center">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-sm font-medium text-slate-500">
              ✓
            </div>

            <h2 className="mt-4 text-sm font-semibold text-slate-800">
              No notifications
            </h2>

            <p className="mt-1 text-sm text-slate-400">You're all caught up.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((notification) => {
              const unread = !notification.readAt;

              return (
                <button
                  key={notification._id}
                  type="button"
                  onClick={() => markAsRead(notification._id)}
                  className={`flex w-full gap-4 px-5 py-4 text-left transition hover:bg-slate-50 ${
                    unread ? "bg-indigo-50/30" : "bg-white"
                  }`}
                >
                  {/* Unread indicator */}
                  <span
                    className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                      unread ? "bg-indigo-500" : "bg-slate-200"
                    }`}
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {getNotificationLabel(notification.type)}
                      </span>

                      <span className="shrink-0 text-xs text-slate-400">
                        {formatTime(notification.createdAt)}
                      </span>
                    </div>

                    <p
                      className={`mt-1.5 text-sm leading-5 ${
                        unread ? "font-medium text-slate-900" : "text-slate-600"
                      }`}
                    >
                      {notification.message}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
