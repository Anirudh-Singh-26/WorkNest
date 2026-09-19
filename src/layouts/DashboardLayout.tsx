import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from "@mui/material";

import { useSocket } from "../context/SocketContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { useAuth } from "../context/AuthContext";

const DashboardLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const { user, logout } = useAuth();

  const { connected, notifications, unreadCount, markAsRead, markAllAsRead } =
    useSocket();

  const { workspaces, currentWorkspace, setCurrentWorkspace, addWorkspace } =
    useWorkspace();

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [workspaceCreating, setWorkspaceCreating] = useState(false);
  const [workspaceError, setWorkspaceError] = useState("");

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const [notificationOpen, setNotificationOpen] = useState(false);

  const getPageTitle = () => {
    if (location.pathname.startsWith("/projects")) {
      return "Projects";
    }

    if (location.pathname.startsWith("/tasks")) {
      return "Tasks";
    }

    if (location.pathname.startsWith("/calendar")) {
      return "Calendar";
    }

    if (location.pathname.startsWith("/timeline")) {
      return "Timeline";
    }

    if (location.pathname.startsWith("/notifications")) {
      return "Notifications";
    }

    if (location.pathname.startsWith("/activity")) {
      return "Activity";
    }

    if (location.pathname.startsWith("/workspace-settings")) {
      return "Workspace Settings";
    }

    return "Dashboard";
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `flex w-full items-center rounded-lg px-3 py-2 text-sm transition ${
      isActive
        ? "bg-indigo-50 font-medium text-indigo-600"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
    }`;

  const handleWorkspaceChange = (workspaceId: string) => {
    const workspace = workspaces.find((item) => item._id === workspaceId);

    if (!workspace) return;

    setCurrentWorkspace(workspace);

    if (/^\/projects\/[^/]+/.test(location.pathname)) {
      navigate("/projects");
    }
  };

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      setWorkspaceError("Workspace name is required");
      return;
    }

    try {
      setWorkspaceCreating(true);
      setWorkspaceError("");

      await addWorkspace(workspaceName.trim());

      setWorkspaceName("");
      setWorkspaceOpen(false);
    } catch (error: any) {
      setWorkspaceError(
        error.response?.data?.message || "Failed to create workspace",
      );
    } finally {
      setWorkspaceCreating(false);
    }
  };

  const handleNotificationClick = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleViewAllNotifications = () => {
    setNotificationOpen(false);
    navigate("/notifications");
  };

  const formatNotificationTime = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();

    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) {
      return "Just now";
    }

    if (minutes < 60) {
      return `${minutes}m ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
      return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days < 7) {
      return `${days}d ago`;
    }

    return new Date(date).toLocaleDateString();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(target) &&
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setUserMenuOpen(false);
        setNotificationOpen(false);
      }

      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

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
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white md:flex md:flex-col">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center border-b border-slate-200 px-6">
          <h1 className="text-xl font-bold text-indigo-600">WorkNest</h1>
        </div>

        {/* Sidebar Content */}
        <div className="flex min-h-0 flex-1 flex-col">
          {/* Workspace */}
          <div className="shrink-0 px-4 pt-5">
            <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
              Workspace
            </p>

            <select
              value={currentWorkspace?._id || ""}
              onChange={(e) => handleWorkspaceChange(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              {workspaces.map((workspace) => (
                <option key={workspace._id} value={workspace._id}>
                  {workspace.name}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setWorkspaceError("");
                setWorkspaceName("");
                setWorkspaceOpen(true);
              }}
              className="mt-2 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-indigo-600 transition hover:bg-indigo-50"
            >
              + Create Workspace
            </button>
          </div>

          {/* Navigation */}
          <nav className="mt-5 flex-1 overflow-y-auto px-4">
            <div className="space-y-1">
              <NavLink to="/dashboard" className={navClass}>
                Dashboard
              </NavLink>

              <NavLink to="/projects" className={navClass}>
                Projects
              </NavLink>

              <NavLink to="/notifications" className={navClass}>
                Notifications
              </NavLink>

              <NavLink to="/workspace-settings" className={navClass}>
                Workspace Settings
              </NavLink>
            </div>
          </nav>

          {/* Logout */}
          <div className="shrink-0 border-t border-slate-200 p-4">
            <div className="mb-3 flex items-center gap-3 px-2">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                {user?.name?.charAt(0)?.toUpperCase() ||
                  user?.email?.charAt(0)?.toUpperCase() ||
                  "U"}
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900">
                  {user?.name || "User"}
                </p>

                <p className="truncate text-xs text-slate-500">{user?.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              className="flex w-full items-center rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex min-h-screen min-w-0 flex-col md:ml-64">
        {/* Sticky Header */}
        <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6">
          <h2 className="text-xl font-semibold text-slate-900">
            {getPageTitle()}
          </h2>

          <div className="flex items-center gap-5">
            {/* Connection */}
            <div className="flex items-center gap-2 text-sm">
              <span
                className={`h-2.5 w-2.5 rounded-full ${
                  connected ? "bg-green-500" : "bg-red-500"
                }`}
              />

              <span className={connected ? "text-green-600" : "text-red-600"}>
                {connected ? "Online" : "Offline"}
              </span>
            </div>

            {/* Notifications */}
            <div ref={notificationRef} className="relative">
              <button
                type="button"
                onClick={() => setNotificationOpen((previous) => !previous)}
                className="relative flex h-9 w-9 items-center justify-center rounded-lg text-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                aria-label="Notifications"
              >
                🔔
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-[18px] text-white">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-12 z-50 w-[360px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                  <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">
                        Notifications
                      </h3>

                      {unreadCount > 0 && (
                        <p className="mt-0.5 text-xs text-slate-500">
                          {unreadCount} unread
                        </p>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={markAllAsRead}
                        className="text-xs font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="max-h-[360px] overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <p className="text-sm font-medium text-slate-700">
                          No notifications
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          You're all caught up.
                        </p>
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((notification) => {
                        const unread = !notification.readAt;

                        return (
                          <button
                            key={notification._id}
                            type="button"
                            onClick={() =>
                              handleNotificationClick(notification._id)
                            }
                            className={`flex w-full gap-3 border-b border-slate-100 px-4 py-3 text-left transition hover:bg-slate-50 ${
                              unread ? "bg-indigo-50/40" : "bg-white"
                            }`}
                          >
                            <span
                              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                                unread ? "bg-indigo-500" : "bg-transparent"
                              }`}
                            />

                            <span className="min-w-0 flex-1">
                              <span className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                  {getNotificationLabel(notification.type)}
                                </span>

                                <span className="shrink-0 text-[11px] text-slate-400">
                                  {formatNotificationTime(
                                    notification.createdAt,
                                  )}
                                </span>
                              </span>

                              <span
                                className={`mt-1 block text-sm ${
                                  unread
                                    ? "font-medium text-slate-900"
                                    : "text-slate-600"
                                }`}
                              >
                                {notification.message}
                              </span>
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>

                  <div className="border-t border-slate-200 px-4 py-3">
                    <button
                      type="button"
                      onClick={handleViewAllNotifications}
                      className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-700"
                    >
                      View all notifications
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* User Avatar */}
            <div ref={userMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setUserMenuOpen((prev) => !prev);
                  setNotificationOpen(false);
                }}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition hover:bg-slate-100"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-600">
                  {user?.name?.charAt(0)?.toUpperCase() ||
                    user?.email?.charAt(0)?.toUpperCase() ||
                    "U"}
                </div>

                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium text-slate-800">
                    {user?.name || "User"}
                  </p>

                  <p className="text-xs text-slate-500">{user?.email}</p>
                </div>
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-12 z-50 w-56 rounded-xl border border-slate-200 bg-white py-2 shadow-lg">
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="text-sm font-medium text-slate-800">
                      {user?.name || "User"}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {user?.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setUserMenuOpen(false);
                      logout();
                    }}
                    className="flex w-full px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>

      {/* Create Workspace Dialog */}
      <Dialog
        open={workspaceOpen}
        onClose={() => {
          if (!workspaceCreating) {
            setWorkspaceOpen(false);
            setWorkspaceError("");
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Create Workspace</DialogTitle>

        <DialogContent>
          <TextField
            label="Workspace Name"
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            fullWidth
            autoFocus
            margin="dense"
          />

          {workspaceError && (
            <p className="mt-2 text-sm text-red-500">{workspaceError}</p>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setWorkspaceOpen(false);
              setWorkspaceError("");
            }}
            disabled={workspaceCreating}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={handleCreateWorkspace}
            disabled={workspaceCreating}
          >
            {workspaceCreating ? "Creating..." : "Create Workspace"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default DashboardLayout;
