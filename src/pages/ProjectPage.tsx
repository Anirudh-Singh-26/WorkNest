import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  enqueueOfflineOperation,
  getOfflineQueue,
  retryOfflineOperation,
  syncOfflineQueue,
  type OfflineOperation,
} from "../utils/offlineQueue";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import {
  createComment,
  deleteComment,
  getComments,
  updateComment,
} from "../api/comment";

import {
  getSavedFilters,
  createSavedFilter,
  updateSavedFilter,
  deleteSavedFilter,
  type SavedFilter,
} from "../api/savedFilter";

import { getProjectAnalytics } from "../api/analytics";
import type { ProjectAnalytics } from "../api/analytics";
import { addDependency, removeDependency } from "../api/dependency";

import {
  getProject,
  addProjectMember,
  removeProjectMember,
  archiveProject,
} from "../api/project";
import type { Project } from "../api/project";
import KanbanBoard from "../components/KanbanBoard";
import CalendarView from "../components/CalendarView";
import TimelineView from "../components/TimelineView";
import type { Comment } from "../api/comment";
import { socket } from "../socket/socket";
import { useAuth } from "../context/AuthContext";

import {
  createTask,
  getTasks,
  getArchivedTasks,
  restoreTask,
  updateTask,
  archiveTask,
  bulkUpdateTasks,
  deleteTask,
} from "../api/task";

import type { Task, TaskPriority, TaskStatus } from "../api/task";

import { useWorkspace } from "../context/WorkspaceContext";
import AnalyticsView from "../components/AnalyticsView";

const ProjectPage = () => {
  const { projectId } = useParams();
  const { currentWorkspace } = useWorkspace();

  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [bulkStatus, setBulkStatus] = useState("");
  const [bulkPriority, setBulkPriority] = useState("");
  const [bulkAssignee, setBulkAssignee] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);

  const [loading, setLoading] = useState(true);

  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  const [offlineQueue, setOfflineQueue] = useState<OfflineOperation[]>(() =>
    getOfflineQueue(),
  );

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [overdueFilter, setOverdueFilter] = useState(false);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [taskPage, setTaskPage] = useState(1);
  const [taskTotalPages, setTaskTotalPages] = useState(1);

  const [analytics, setAnalytics] = useState<ProjectAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([]);
  const [selectedSavedFilter, setSelectedSavedFilter] = useState("");
  const [savedFilterName, setSavedFilterName] = useState("");

  const [dependencyToAdd, setDependencyToAdd] = useState("");
  const [dependencySaving, setDependencySaving] = useState(false);
  const [dependencyError, setDependencyError] = useState("");

  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [archivedLoading, setArchivedLoading] = useState(false);

  const [view, setView] = useState<
    "board" | "calendar" | "timeline" | "analytics" | "archived"
  >("board");
  const [createOpen, setCreateOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [memberSaving, setMemberSaving] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [memberToAdd, setMemberToAdd] = useState("");
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentSaving, setCommentSaving] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentText, setEditingCommentText] = useState("");

  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assignee: "",
    status: "TODO" as TaskStatus,
    priority: "MEDIUM" as TaskPriority,
    startDate: "",
    dueDate: "",
    labels: "",
    estimate: "",
  });

  const getCurrentFilters = () => ({
    search: search || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
    assignee: assigneeFilter || undefined,
    label: labelFilter || undefined,
    overdue: overdueFilter || undefined,
    sortBy,
    sortOrder,
  });

  const toggleTaskSelection = (taskId: string) => {
    setSelectedTaskIds((current) =>
      current.includes(taskId)
        ? current.filter((id) => id !== taskId)
        : [...current, taskId],
    );
  };

  const toggleSelectAllTasks = () => {
    const allSelected = tasks.every((task) =>
      selectedTaskIds.includes(task._id),
    );

    if (allSelected) {
      setSelectedTaskIds((current) =>
        current.filter((id) => !tasks.some((task) => task._id === id)),
      );
      return;
    }

    setSelectedTaskIds((current) => [
      ...current,
      ...tasks.map((task) => task._id).filter((id) => !current.includes(id)),
    ]);
  };

  const handleDeleteTask = async (task: Task) => {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${task.title}"?`,
    );

    if (!confirmed) return;

    try {
      await deleteTask(task._id);

      setTasks((prev) => prev.filter((item) => item._id !== task._id));
    } catch (error: any) {
      console.error("Failed to delete task", error);

      alert(error.response?.data?.message || "Failed to delete task");
    }
  };

  const handleBulkUpdate = async () => {
    if (selectedTaskIds.length === 0) return;

    const updates: {
      status?: TaskStatus;
      priority?: TaskPriority;
      assignee?: string;
    } = {};

    if (bulkStatus) {
      updates.status = bulkStatus as TaskStatus;
    }

    if (bulkPriority) {
      updates.priority = bulkPriority as TaskPriority;
    }

    if (bulkAssignee) {
      updates.assignee = bulkAssignee;
    }

    if (Object.keys(updates).length === 0) {
      alert("Select at least one action");
      return;
    }

    try {
      setBulkSaving(true);

      const selectedTasks = tasks
        .filter((task) => selectedTaskIds.includes(task._id))
        .map((task) => ({
          id: task._id,
          version: task.version,
        }));

      const result = await bulkUpdateTasks(selectedTasks, updates);

      setTasks((currentTasks) =>
        currentTasks.map((task) => {
          const updatedTask = result.successful.find(
            (item) => item._id === task._id,
          );

          return updatedTask || task;
        }),
      );

      setSelectedTaskIds([]);

      setBulkStatus("");
      setBulkPriority("");
      setBulkAssignee("");

      if (result.failed.length > 0) {
        alert(
          `${result.successful.length} task(s) updated. ${result.failed.length} task(s) failed.`,
        );
      }
    } catch (error: any) {
      console.error("Bulk update failed", error);

      alert(error.response?.data?.message || "Failed to update selected tasks");
    } finally {
      setBulkSaving(false);
    }
  };

  const loadProject = async () => {
    if (!projectId || !currentWorkspace) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const projectData = await getProject(currentWorkspace._id, projectId);

      setProject(projectData);
    } catch (error) {
      console.error("Failed to load project", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAnalytics = async () => {
    if (!projectId) return;

    try {
      setAnalyticsLoading(true);

      const data = await getProjectAnalytics(projectId);

      setAnalytics(data);
    } catch (error) {
      console.error("Failed to load analytics", error);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadSavedFilters = async () => {
    if (!projectId) return;

    try {
      const filters = await getSavedFilters(projectId);

      setSavedFilters(filters);

      const defaultFilter = filters.find((filter) => filter.isDefault);

      if (defaultFilter) {
        setSelectedSavedFilter(defaultFilter._id);
      }
    } catch (error) {
      console.error("Failed to load saved filters", error);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [projectId]);

  useEffect(() => {
    loadSavedFilters();
  }, [projectId]);

  const handleSaveFilter = async () => {
    if (!projectId || !savedFilterName.trim()) {
      return;
    }

    try {
      const filter = await createSavedFilter(
        projectId,
        savedFilterName.trim(),
        getCurrentFilters(),
      );

      setSavedFilters((current) => [filter, ...current]);
      setSelectedSavedFilter(filter._id);
      setSavedFilterName("");
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to save filter");
    }
  };

  const handleApplySavedFilter = (filterId: string) => {
    setSelectedSavedFilter(filterId);

    const filter = savedFilters.find((item) => item._id === filterId);

    if (!filter) return;

    const filters = filter.filters || {};

    setSearch(filters.search || "");
    setStatusFilter(filters.status || "");
    setPriorityFilter(filters.priority || "");
    setAssigneeFilter(filters.assignee || "");
    setLabelFilter(filters.label || "");
    setOverdueFilter(Boolean(filters.overdue));
    setSortBy(filters.sortBy || "createdAt");
    setSortOrder(filters.sortOrder || "desc");
    setTaskPage(1);
  };

  const handleDeleteSavedFilter = async (filterId: string) => {
    const confirmed = window.confirm("Delete this saved filter?");

    if (!confirmed) return;

    try {
      await deleteSavedFilter(filterId);

      setSavedFilters((current) =>
        current.filter((filter) => filter._id !== filterId),
      );

      if (selectedSavedFilter === filterId) {
        setSelectedSavedFilter("");
      }
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to delete saved filter");
    }
  };

  const handleUpdateSavedFilter = async () => {
    if (!selectedSavedFilter) return;

    try {
      const updatedFilter = await updateSavedFilter(selectedSavedFilter, {
        filters: getCurrentFilters(),
      });

      setSavedFilters((current) =>
        current.map((filter) =>
          filter._id === updatedFilter._id ? updatedFilter : filter,
        ),
      );
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to update saved filter");
    }
  };

  const handleSetDefaultFilter = async () => {
    if (!selectedSavedFilter) return;

    try {
      const updatedFilter = await updateSavedFilter(selectedSavedFilter, {
        isDefault: true,
      });

      setSavedFilters((current) =>
        current.map((filter) => ({
          ...filter,
          isDefault: filter._id === updatedFilter._id,
        })),
      );
    } catch (error: any) {
      alert(error.response?.data?.message || "Failed to set default filter");
    }
  };

  const loadTasks = async () => {
    if (!projectId) return;

    const cacheKey = `fixl_tasks_cache_${projectId}`;

    try {
      const taskData = await getTasks(projectId, {
        search: search || undefined,
        status: statusFilter ? (statusFilter as TaskStatus) : undefined,
        priority: priorityFilter ? (priorityFilter as TaskPriority) : undefined,
        assignee: assigneeFilter || undefined,
        label: labelFilter || undefined,
        overdue: overdueFilter || undefined,
        sortBy,
        sortOrder,
        page: taskPage,
        limit: 100,
      });

      setTasks(taskData.tasks);
      setTaskTotalPages(taskData.pagination.totalPages);

      localStorage.setItem(cacheKey, JSON.stringify(taskData.tasks));
    } catch (error) {
      console.error("Failed to load tasks", error);

      try {
        const cachedTasks = localStorage.getItem(cacheKey);

        if (cachedTasks) {
          setTasks(JSON.parse(cachedTasks));
          setTaskTotalPages(1);
        }
      } catch {
        console.error("Failed to load cached tasks");
      }
    }
  };

  const loadArchivedTasks = async () => {
    if (!projectId) return;

    try {
      setArchivedLoading(true);

      const data = await getArchivedTasks(projectId);

      setArchivedTasks(data);
    } catch (error) {
      console.error("Failed to load archived tasks", error);
    } finally {
      setArchivedLoading(false);
    }
  };

  const currentWorkspaceMember = currentWorkspace?.members.find(
    (member: any) => {
      const memberId =
        typeof member.user === "string" ? member.user : member.user?._id;

      return memberId === user?._id;
    },
  );

  const canManageProjectMembers =
    currentWorkspaceMember?.role === "OWNER" ||
    currentWorkspaceMember?.role === "ADMIN" ||
    currentWorkspaceMember?.role === "MANAGER";

  const canManageDependencies =
    currentWorkspaceMember?.role === "OWNER" ||
    currentWorkspaceMember?.role === "ADMIN" ||
    currentWorkspaceMember?.role === "MANAGER";

  const canManageTasks =
    currentWorkspaceMember?.role === "OWNER" ||
    currentWorkspaceMember?.role === "ADMIN" ||
    currentWorkspaceMember?.role === "MANAGER";  

  const canDeleteProject =
    currentWorkspaceMember?.role === "OWNER" ||
    currentWorkspaceMember?.role === "ADMIN";

  const workspaceMembers = currentWorkspace?.members || [];

  const loadComments = async (taskId: string) => {
    try {
      setCommentsLoading(true);

      const data = await getComments(taskId);

      setComments(data);
    } catch (error) {
      console.error("Failed to load comments", error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!project || !currentWorkspace) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${project.name}"?`,
    );

    if (!confirmed) return;

    try {
      await archiveProject(currentWorkspace._id, project._id);

      window.location.href = "/projects";
    } catch (error: any) {
      console.error("Failed to delete project", error);

      alert(error.response?.data?.message || "Failed to delete project");
    }
  };

  useEffect(() => {
    if (!project?.workspace) return;

    if (!socket.connected) return;

    socket.emit("join-workspace", project.workspace);
  }, [project?.workspace]);

  useEffect(() => {
    if (!selectedTask) return;

    const handleCommentCreated = (comment: Comment) => {
      if (comment.task !== selectedTask._id) return;

      setComments((current) => {
        const exists = current.some((item) => item._id === comment._id);

        if (exists) {
          return current;
        }

        return [...current, comment];
      });
    };

    const handleCommentUpdated = (comment: Comment) => {
      if (comment.task !== selectedTask._id) return;

      setComments((current) =>
        current.map((item) => (item._id === comment._id ? comment : item)),
      );
    };

    const handleCommentDeleted = (data: {
      commentId: string;
      taskId: string;
    }) => {
      if (data.taskId !== selectedTask._id) return;

      setComments((current) =>
        current.filter((item) => item._id !== data.commentId),
      );
    };

    socket.on("comment.created", handleCommentCreated);
    socket.on("comment.updated", handleCommentUpdated);
    socket.on("comment.deleted", handleCommentDeleted);

    return () => {
      socket.off("comment.created", handleCommentCreated);
      socket.off("comment.updated", handleCommentUpdated);
      socket.off("comment.deleted", handleCommentDeleted);
    };
  }, [selectedTask]);

  useEffect(() => {
    if (!projectId) return;

    const handleTaskCreated = (task: Task) => {
      if (task.project !== projectId) return;

      setTasks((currentTasks) => {
        const exists = currentTasks.some((item) => item._id === task._id);

        if (exists) {
          return currentTasks;
        }

        return [task, ...currentTasks];
      });
    };

    const handleTaskUpdated = (task: Task) => {
      if (task.project !== projectId) return;

      setTasks((currentTasks) =>
        currentTasks.map((item) => (item._id === task._id ? task : item)),
      );
    };

    const handleTaskMoved = (task: Task) => {
      if (task.project !== projectId) return;

      setTasks((currentTasks) =>
        currentTasks.map((item) => (item._id === task._id ? task : item)),
      );
    };

    const handleTaskArchived = (data: { taskId: string }) => {
      setTasks((currentTasks) =>
        currentTasks.filter((task) => task._id !== data.taskId),
      );
    };

    const handleTaskDeleted = (data: { taskId: string; projectId: string }) => {
      if (data.projectId !== projectId) return;

      setTasks((currentTasks) =>
        currentTasks.filter((task) => task._id !== data.taskId),
      );
    };

    const handleTaskRestored = (task: Task) => {
      if (task.project !== projectId) return;

      setTasks((currentTasks) => {
        const exists = currentTasks.some((item) => item._id === task._id);

        if (exists) {
          return currentTasks.map((item) =>
            item._id === task._id ? task : item,
          );
        }

        return [task, ...currentTasks];
      });
    };

    socket.on("task.created", handleTaskCreated);
    socket.on("task.updated", handleTaskUpdated);
    socket.on("task.moved", handleTaskMoved);
    socket.on("task.archived", handleTaskArchived);
    socket.on("task.restored", handleTaskRestored);
    socket.on("task.deleted", handleTaskDeleted);

    return () => {
      socket.off("task.created", handleTaskCreated);
      socket.off("task.updated", handleTaskUpdated);
      socket.off("task.moved", handleTaskMoved);
      socket.off("task.archived", handleTaskArchived);
      socket.off("task.restored", handleTaskRestored);
      socket.off("task.deleted", handleTaskDeleted);
    };
  }, [projectId]);

  useEffect(() => {
    loadProject();
  }, [projectId, currentWorkspace]);

  useEffect(() => {
    loadTasks();
  }, [
    projectId,
    search,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    labelFilter,
    overdueFilter,
    sortBy,
    sortOrder,
    taskPage,
  ]);

  useEffect(() => {
    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleOnline = async () => {
      setIsOnline(true);

      const updatedQueue = await syncOfflineQueue();

      setOfflineQueue(updatedQueue);

      await loadTasks();

      if (selectedTask) {
        await loadComments(selectedTask._id);
      }
    };

    window.addEventListener("offline", handleOffline);
    window.addEventListener("online", handleOnline);

    if (navigator.onLine) {
      syncOfflineQueue().then((updatedQueue) => {
        setOfflineQueue(updatedQueue);
      });
    }

    return () => {
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("online", handleOnline);
    };
  }, [projectId, selectedTask?._id]);

  useEffect(() => {
    setSelectedTaskIds([]);
  }, [
    search,
    statusFilter,
    priorityFilter,
    assigneeFilter,
    labelFilter,
    overdueFilter,
    sortBy,
    sortOrder,
    taskPage,
  ]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      assignee: "",
      status: "TODO",
      priority: "MEDIUM",
      startDate: "",
      dueDate: "",
      labels: "",
      estimate: "",
    });

    setError("");
  };

  const handleCreateTask = async () => {
    if (!projectId) return;

    if (!formData.title.trim()) {
      setError("Task title is required");
      return;
    }

    if (
      formData.startDate &&
      formData.dueDate &&
      formData.dueDate < formData.startDate
    ) {
      setError("Due date cannot be before the start date");
      return;
    }

    try {
      setSaving(true);
      setError("");

      await createTask(projectId, {
        title: formData.title.trim(),
        description: formData.description.trim(),
        assignee: formData.assignee || undefined,
        status: formData.status,
        priority: formData.priority,
        startDate: formData.startDate || undefined,
        dueDate: formData.dueDate || undefined,
        labels: formData.labels
          .split(",")
          .map((label) => label.trim())
          .filter(Boolean),
        estimate: formData.estimate ? Number(formData.estimate) : undefined,
      });


      resetForm();
      setCreateOpen(false);
    } catch (error: any) {
      console.error("Failed to create task", error);

      setError(error.response?.data?.message || "Failed to create task");
    } finally {
      setSaving(false);
    }
  };

  const openEditTask = (task: Task) => {
    setSelectedTask(task);

    setFormData({
      title: task.title,
      description: task.description || "",
      assignee: task.assignee?._id || "",
      status: task.status,
      priority: task.priority,
      startDate: task.startDate ? task.startDate.substring(0, 10) : "",
      dueDate: task.dueDate ? task.dueDate.substring(0, 10) : "",
      labels: task.labels.join(", "),
      estimate: task.estimate?.toString() || "",
    });

    setComments([]);
    setCommentText("");
    setEditingCommentId(null);
    setEditingCommentText("");
    setDependencyToAdd("");
    setDependencyError("");

    setError("");
    setEditOpen(true);

    loadComments(task._id);
  };
  

  const handleCreateComment = async () => {
    if (!selectedTask || !commentText.trim()) {
      return;
    }

    const body = commentText.trim();

    if (!isOnline) {
      const operation = enqueueOfflineOperation({
        type: "COMMENT_CREATE",
        projectId: projectId || "",
        taskId: selectedTask._id,
        payload: {
          body,
        },
      });

      const offlineComment: Comment = {
        _id: `offline-${operation.id}`,
        task: selectedTask._id,
        author: {
          _id: user?._id || "",
          name: user?.name || "You",
          email: user?.email || "",
        },
        body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      setComments((current) => [...current, offlineComment]);

      setOfflineQueue(getOfflineQueue());
      setCommentText("");

      return;
    }

    try {
      setCommentSaving(true);

      await createComment(selectedTask._id, body);

      setCommentText("");

      await loadComments(selectedTask._id);
    } catch (error) {
      console.error("Failed to create comment", error);
    } finally {
      setCommentSaving(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!editingCommentText.trim()) {
      return;
    }

    try {
      const updatedComment = await updateComment(
        commentId,
        editingCommentText.trim(),
      );

      setComments((current) =>
        current.map((item) =>
          item._id === commentId
            ? {
                ...item,
                body: updatedComment.body,
                updatedAt: updatedComment.updatedAt,
              }
            : item,
        ),
      );

      setEditingCommentId(null);
      setEditingCommentText("");
    } catch (error) {
      console.error("Failed to update comment", error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteComment(commentId);

      setComments((current) =>
        current.filter((item) => item._id !== commentId),
      );
    } catch (error) {
      console.error("Failed to delete comment", error);
    }
  };

  const handleAddDependency = async () => {
    if (!selectedTask || !dependencyToAdd) return;

    try {
      setDependencySaving(true);
      setDependencyError("");

      const updatedTask = await addDependency(
        selectedTask._id,
        dependencyToAdd,
      );

      setSelectedTask(updatedTask);

      setTasks((prev) =>
        prev.map((task) => (task._id === updatedTask._id ? updatedTask : task)),
      );

      setDependencyToAdd("");
    } catch (error: any) {
      setDependencyError(
        error?.response?.data?.message || "Failed to add dependency",
      );
    } finally {
      setDependencySaving(false);
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    if (!selectedTask) return;

    try {
      setDependencySaving(true);
      setDependencyError("");

      const updatedTask = await removeDependency(
        selectedTask._id,
        dependencyId,
      );

      setSelectedTask(updatedTask);

      setTasks((prev) =>
        prev.map((task) => (task._id === updatedTask._id ? updatedTask : task)),
      );
    } catch (error: any) {
      setDependencyError(
        error?.response?.data?.message || "Failed to remove dependency",
      );
    } finally {
      setDependencySaving(false);
    }
  };

  const handleUpdateTask = async () => {
    if (!selectedTask) return;

    if (!formData.title.trim()) {
      setError("Task title is required");
      return;
    }

    if (
      formData.startDate &&
      formData.dueDate &&
      formData.dueDate < formData.startDate
    ) {
      setError("Due date cannot be before the start date");
      return;
    }

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      assignee: formData.assignee || undefined,
      status: formData.status,
      priority: formData.priority,
      startDate: formData.startDate || undefined,
      dueDate: formData.dueDate || undefined,
      labels: formData.labels
        .split(",")
        .map((label) => label.trim())
        .filter(Boolean),
      estimate: formData.estimate ? Number(formData.estimate) : undefined,
      version: selectedTask.version,
    };

    if (!isOnline) {
      const updatedOfflineTask: Task = {
        ...selectedTask,
        title: payload.title,
        description: payload.description,
        status: payload.status,
        priority: payload.priority,
        startDate: payload.startDate,
        dueDate: payload.dueDate,
        labels: payload.labels,
        estimate: payload.estimate,
      };

      setTasks((prev) =>
        prev.map((task) =>
          task._id === selectedTask._id ? updatedOfflineTask : task,
        ),
      );

      setSelectedTask(updatedOfflineTask);

      enqueueOfflineOperation({
        type: "TASK_UPDATE",
        projectId: projectId || "",
        taskId: selectedTask._id,
        payload,
      });

      setOfflineQueue(getOfflineQueue());

      setEditOpen(false);
      setSelectedTask(null);
      resetForm();

      return;
    }

    try {
      setSaving(true);
      setError("");

      const updatedTask = await updateTask(selectedTask._id, payload);

      setTasks((prev) =>
        prev.map((task) => (task._id === updatedTask._id ? updatedTask : task)),
      );

      setEditOpen(false);
      setSelectedTask(null);
      resetForm();
    } catch (error: any) {
      console.error("Failed to update task", error);

      setError(error.response?.data?.message || "Failed to update task");
    } finally {
      setSaving(false);
    }
  };

  const handleArchiveTask = async (task: Task) => {
    const confirmed = window.confirm(`Archive "${task.title}"?`);

    if (!confirmed) return;

    try {
      await archiveTask(task._id, task.version);

      setTasks((prev) => prev.filter((item) => item._id !== task._id));
    } catch (error: any) {
      console.error("Failed to archive task", error);

      alert(error.response?.data?.message || "Failed to archive task");
    }
  };

  const handleAddProjectMember = async () => {
    if (
      !projectId ||
      !currentWorkspace ||
      !memberToAdd ||
      memberToAdd === user?._id
    ) {
      return;
    }

    try {
      setMemberSaving(true);
      setMemberError("");

      const updatedProject = await addProjectMember(
        currentWorkspace._id,
        projectId,
        memberToAdd,
      );

      setProject(updatedProject);
      setMemberToAdd("");
    } catch (error: any) {
      console.error("Failed to add project member", error);

      setMemberError(
        error.response?.data?.message || "Failed to add project member",
      );
    } finally {
      setMemberSaving(false);
    }
  };

  const handleRemoveProjectMember = async (userId: string) => {
    if (!projectId || !currentWorkspace || userId === user?._id) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove this member from the project?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setMemberSaving(true);
      setMemberError("");

      const updatedProject = await removeProjectMember(
        currentWorkspace._id,
        projectId,
        userId,
      );

      setProject(updatedProject);
    } catch (error: any) {
      console.error("Failed to remove project member", error);

      setMemberError(
        error.response?.data?.message || "Failed to remove project member",
      );
    } finally {
      setMemberSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-slate-500">Loading project...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="p-6">
        <div className="rounded-xl border border-slate-200 bg-white p-8">
          <h2 className="text-lg font-semibold text-slate-900">
            Project not found
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {(!isOnline || offlineQueue.length > 0) && (
        <div
          className={`mb-4 rounded-xl border p-4 ${
            !isOnline
              ? "border-amber-200 bg-amber-50"
              : offlineQueue.some((operation) => operation.status === "failed")
                ? "border-red-200 bg-red-50"
                : "border-blue-200 bg-blue-50"
          }`}
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {!isOnline
                  ? "You're offline"
                  : offlineQueue.some(
                        (operation) => operation.status === "failed",
                      )
                    ? "Some offline changes failed"
                    : "Offline changes syncing"}
              </p>

              <p className="mt-1 text-xs text-slate-600">
                {!isOnline
                  ? "Recent data is available. Task edits and comments will be queued until you're back online."
                  : `${offlineQueue.length} change${
                      offlineQueue.length === 1 ? "" : "s"
                    } waiting to sync.`}
              </p>
            </div>

            {offlineQueue.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {offlineQueue.map((operation) => (
                  <div
                    key={operation.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs"
                  >
                    <span>
                      {operation.type === "TASK_UPDATE"
                        ? "Task edit"
                        : "Comment"}
                    </span>

                    <span
                      className={
                        operation.status === "failed"
                          ? "font-medium text-red-600"
                          : operation.status === "syncing"
                            ? "font-medium text-blue-600"
                            : "text-amber-600"
                      }
                    >
                      {operation.status === "pending"
                        ? "Pending"
                        : operation.status === "syncing"
                          ? "Syncing..."
                          : "Failed"}
                    </span>

                    {operation.status === "failed" && (
                      <button
                        type="button"
                        onClick={async () => {
                          const updatedQueue = retryOfflineOperation(
                            operation.id,
                          );

                          setOfflineQueue(updatedQueue);

                          if (navigator.onLine) {
                            const syncedQueue = await syncOfflineQueue();

                            setOfflineQueue(syncedQueue);

                            await loadTasks();

                            if (selectedTask) {
                              await loadComments(selectedTask._id);
                            }
                          }
                        }}
                        className="font-medium text-indigo-600 hover:text-indigo-700"
                      >
                        Retry
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {offlineQueue.some((operation) => operation.status === "failed") && (
            <div className="mt-2 text-xs text-red-600">
              {offlineQueue
                .filter((operation) => operation.status === "failed")
                .map((operation) => operation.error)
                .filter(Boolean)
                .join(" • ")}
            </div>
          )}
        </div>
      )}
      {/* Project Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">
              {project.name}
            </h1>

            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-600">
              {project.status.replace("_", " ")}
            </span>
          </div>

          <p className="mt-2 text-sm text-slate-500">
            {project.description || "No description"}
          </p>

          <p className="mt-2 text-sm text-slate-400">
            {project.members.length}{" "}
            {project.members.length === 1 ? "member" : "members"}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {project.members.map((member) => (
              <div
                key={member._id}
                className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                  {member.name?.charAt(0)?.toUpperCase() || "U"}
                </div>

                <div>
                  <p className="text-xs font-medium text-slate-800">
                    {member.name}
                  </p>
                  <p className="text-[11px] text-slate-400">{member.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {canDeleteProject && (
          <Button
            variant="outlined"
            color="error"
            onClick={handleDeleteProject}
          >
            Delete Project
          </Button>
        )}

        <Button
          variant="contained"
          onClick={() => {
            resetForm();
            setCreateOpen(true);
          }}
        >
          + New Task
        </Button>
      </div>

      {/* Project Members */}
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Project Members
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage who can work on this project.
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {project.members.length}{" "}
            {project.members.length === 1 ? "member" : "members"}
          </span>
        </div>

        {/* Member List */}
        <div className="mt-4 space-y-2">
          {project.members.map((member) => {
            const workspaceMember = workspaceMembers.find((item: any) => {
              const memberId =
                typeof item.user === "string" ? item.user : item.user?._id;

              return memberId === member._id;
            });

            const workspaceRole = workspaceMember?.role || "MEMBER";

            return (
              <div
                key={member._id}
                className="flex items-center justify-between rounded-lg border border-slate-100 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-sm font-semibold text-indigo-600">
                    {member.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {member.name}
                      </p>

                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          workspaceRole === "OWNER"
                            ? "bg-indigo-50 text-indigo-600"
                            : workspaceRole === "ADMIN"
                              ? "bg-purple-50 text-purple-600"
                              : workspaceRole === "MANAGER"
                                ? "bg-blue-50 text-blue-600"
                                : workspaceRole === "VIEWER"
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-green-50 text-green-600"
                        }`}
                      >
                        {workspaceRole}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>
                </div>

                {canManageProjectMembers && member._id !== user?._id && (
                  <Button
                    size="small"
                    color="error"
                    variant="outlined"
                    disabled={memberSaving}
                    onClick={() => handleRemoveProjectMember(member._id)}
                  >
                    Remove
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Member */}
        {canManageProjectMembers && (
          <div className="mt-5 border-t border-slate-100 pt-5">
            <h3 className="text-sm font-semibold text-slate-800">
              Add Project Member
            </h3>

            <div className="mt-3 flex flex-col gap-3 sm:flex-row">
              <div className="relative w-full">
                <button
                  type="button"
                  onClick={() => setMemberDropdownOpen((current) => !current)}
                  className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-left text-sm text-slate-700 outline-none transition hover:border-slate-400 focus:border-indigo-500"
                >
                  <span
                    className={
                      memberToAdd ? "text-slate-800" : "text-slate-400"
                    }
                  >
                    {(() => {
                      const selectedMember = workspaceMembers.find(
                        (workspaceMember: any) => {
                          const id =
                            typeof workspaceMember.user === "string"
                              ? workspaceMember.user
                              : workspaceMember.user?._id;

                          return id === memberToAdd;
                        },
                      );

                      if (!selectedMember) {
                        return "Select workspace member";
                      }

                      const selectedUser: any = selectedMember.user;

                      return typeof selectedUser === "string"
                        ? selectedUser
                        : selectedUser?.name || "Workspace Member";
                    })()}
                  </span>

                  <svg
                    className={`h-4 w-4 text-slate-400 transition-transform ${
                      memberDropdownOpen ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                {memberDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setMemberToAdd("");
                        setMemberDropdownOpen(false);
                      }}
                      className="w-full px-3 py-2.5 text-left text-sm text-slate-400 hover:bg-slate-50"
                    >
                      Select workspace member
                    </button>

                    {workspaceMembers
                      .filter((workspaceMember: any) => {
                        const id =
                          typeof workspaceMember.user === "string"
                            ? workspaceMember.user
                            : workspaceMember.user?._id;

                        return (
                          id !== user?._id &&
                          !project.members.some(
                            (projectMember) => projectMember._id === id,
                          )
                        );
                      })
                      .map((workspaceMember: any) => {
                        const id =
                          typeof workspaceMember.user === "string"
                            ? workspaceMember.user
                            : workspaceMember.user?._id;

                        const name =
                          typeof workspaceMember.user === "string"
                            ? id
                            : workspaceMember.user?.name || "Workspace Member";

                        const email =
                          typeof workspaceMember.user === "string"
                            ? ""
                            : workspaceMember.user?.email || "";
                        const role = workspaceMember.role || "MEMBER";

                        return (
                          <button
                            type="button"
                            key={id}
                            onClick={() => {
                              setMemberToAdd(id);
                              setMemberDropdownOpen(false);
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">
                              {name.charAt(0).toUpperCase()}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800">
                                {name}
                              </p>

                              {email && (
                                <p className="truncate text-xs text-slate-400">
                                  {email}
                                </p>
                              )}
                            </div>

                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                role === "OWNER"
                                  ? "bg-indigo-50 text-indigo-600"
                                  : role === "ADMIN"
                                    ? "bg-purple-50 text-purple-600"
                                    : role === "MANAGER"
                                      ? "bg-blue-50 text-blue-600"
                                      : role === "VIEWER"
                                        ? "bg-slate-100 text-slate-600"
                                        : "bg-green-50 text-green-600"
                              }`}
                            >
                              {role}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                )}
              </div>

              <Button
                variant="contained"
                disabled={!memberToAdd || memberSaving}
                onClick={handleAddProjectMember}
                className="!whitespace-nowrap"
              >
                {memberSaving ? "Saving..." : "Add User"}
              </Button>
            </div>

            {memberError && (
              <p className="mt-2 text-sm text-red-500">{memberError}</p>
            )}
          </div>
        )}
      </div>

      <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Saved Filters
            </h3>

            <p className="text-xs text-slate-500">
              Save and reuse your task filters.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={selectedSavedFilter}
              onChange={(event) => handleApplySavedFilter(event.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
            >
              <option value="">Select saved filter</option>

              {savedFilters.map((filter) => (
                <option key={filter._id} value={filter._id}>
                  {filter.name}
                  {filter.isDefault ? " ★" : ""}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={savedFilterName}
              onChange={(event) => setSavedFilterName(event.target.value)}
              placeholder="Filter name"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none"
            />

            <button
              type="button"
              onClick={handleSaveFilter}
              disabled={!savedFilterName.trim()}
              className="rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Save
            </button>

            <button
              type="button"
              onClick={handleUpdateSavedFilter}
              disabled={!selectedSavedFilter}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Update
            </button>

            <button
              type="button"
              onClick={handleSetDefaultFilter}
              disabled={!selectedSavedFilter}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Set Default
            </button>

            <button
              type="button"
              onClick={() => {
                if (selectedSavedFilter) {
                  handleDeleteSavedFilter(selectedSavedFilter);
                }
              }}
              disabled={!selectedSavedFilter}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete
            </button>
          </div>
        </div>
      </div>

      {tasks.length > 0 && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={
                    tasks.length > 0 && selectedTaskIds.length === tasks.length
                  }
                  onChange={toggleSelectAllTasks}
                />
                Select All
              </label>

              {selectedTaskIds.length > 0 && (
                <span className="text-sm text-slate-500">
                  {selectedTaskIds.length} selected
                </span>
              )}
            </div>

            {selectedTaskIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={bulkStatus}
                  onChange={(event) => setBulkStatus(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="">Change Status</option>
                  <option value="TODO">Todo</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="BLOCKED">Blocked</option>
                  <option value="COMPLETED">Completed</option>
                </select>

                <select
                  value={bulkPriority}
                  onChange={(event) => setBulkPriority(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="">Change Priority</option>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>

                <select
                  value={bulkAssignee}
                  onChange={(event) => setBulkAssignee(event.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="">Change Assignee</option>

                  {project.members.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleBulkUpdate}
                  disabled={bulkSaving}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {bulkSaving ? "Updating..." : "Apply"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task List */}
      {/* Task Filters */}
      <div className="mb-5 rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
          {/* Search */}
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setTaskPage(1);
            }}
            placeholder="Search tasks..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />

          {/* Status */}
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setTaskPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="TODO">Todo</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="BLOCKED">Blocked</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setTaskPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </select>

          {/* Assignee */}
          <select
            value={assigneeFilter}
            onChange={(e) => {
              setAssigneeFilter(e.target.value);
              setTaskPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="">All Assignees</option>

            {project.members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name}
              </option>
            ))}
          </select>

          {/* Label */}
          <input
            type="text"
            value={labelFilter}
            onChange={(e) => {
              setLabelFilter(e.target.value);
              setTaskPage(1);
            }}
            placeholder="Filter by label..."
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          />

          {/* Sort By */}
          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setTaskPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="createdAt">Created Date</option>
            <option value="updatedAt">Updated Date</option>
            <option value="dueDate">Due Date</option>
            <option value="startDate">Start Date</option>
            <option value="priority">Priority</option>
            <option value="status">Status</option>
            <option value="title">Title</option>
          </select>

          {/* Sort Order */}
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as "asc" | "desc");
              setTaskPage(1);
            }}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>

          {/* Overdue */}
          <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={overdueFilter}
              onChange={(e) => {
                setOverdueFilter(e.target.checked);
                setTaskPage(1);
              }}
            />
            Show overdue only
          </label>
        </div>

        {/* Clear Filters */}
        <button
          type="button"
          onClick={() => {
            setSearch("");
            setStatusFilter("");
            setPriorityFilter("");
            setAssigneeFilter("");
            setLabelFilter("");
            setOverdueFilter(false);
            setSortBy("createdAt");
            setSortOrder("desc");
            setTaskPage(1);
          }}
          className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Clear Filters
        </button>
      </div>

      {/* Task Views */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Tasks</h2>

            <p className="mt-1 text-sm text-slate-500">
              Manage your project tasks.
            </p>
          </div>

          <div className="flex rounded-lg border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setView("board")}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                view === "board"
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Board
            </button>

            <button
              type="button"
              onClick={() => setView("calendar")}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                view === "calendar"
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Calendar
            </button>

            <button
              type="button"
              onClick={() => setView("timeline")}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                view === "timeline"
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Timeline
            </button>

            <button
              type="button"
              onClick={() => setView("analytics")}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                view === "analytics"
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Analytics
            </button>

            <button
              type="button"
              onClick={() => {
                setView("archived");
                loadArchivedTasks();
              }}
              className={`rounded-md px-4 py-2 text-sm font-medium ${
                view === "archived"
                  ? "bg-indigo-50 text-indigo-600"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Archived
            </button>
          </div>
        </div>

        {view === "board" ? (
          <KanbanBoard
            tasks={tasks}
            setTasks={setTasks}
            onEditTask={canManageTasks ? openEditTask : undefined}
            onArchiveTask={canManageTasks ? handleArchiveTask : undefined}
            onDeleteTask={canManageTasks ? handleDeleteTask : undefined}
            selectedTaskIds={selectedTaskIds}
            onToggleTaskSelection={toggleTaskSelection}
          />
        ) : view === "calendar" ? (
          <CalendarView projectId={projectId!} onEditTask={openEditTask} />
        ) : view === "timeline" ? (
          <TimelineView projectId={projectId!} onEditTask={openEditTask} />
        ) : view === "analytics" ? (
          <AnalyticsView analytics={analytics} loading={analyticsLoading} />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h3 className="text-lg font-semibold text-slate-900">
              Archived Tasks
            </h3>

            {archivedLoading ? (
              <p className="mt-4 text-sm text-slate-500">
                Loading archived tasks...
              </p>
            ) : archivedTasks.length === 0 ? (
              <p className="mt-4 text-sm text-slate-500">No archived tasks.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {archivedTasks.map((task) => (
                  <div
                    key={task._id}
                    className="flex items-center justify-between rounded-lg border border-slate-200 p-4"
                  >
                    <div>
                      <p className="font-medium text-slate-900">{task.title}</p>

                      <p className="mt-1 text-xs text-slate-500">
                        {task.status.replace("_", " ")} • {task.priority}
                      </p>
                    </div>

                    {canManageTasks && (
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await restoreTask(task._id);

                            setArchivedTasks((current) =>
                              current.filter((item) => item._id !== task._id),
                            );
                          } catch (error: any) {
                            alert(
                              error.response?.data?.message ||
                                "Failed to restore task",
                            );
                          }
                        }}
                        className="rounded-lg border border-indigo-200 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
                      >
                        Restore
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {taskTotalPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={taskPage === 1}
              onClick={() => setTaskPage((page) => page - 1)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>

            <span className="text-sm text-slate-600">
              Page {taskPage} of {taskTotalPages}
            </span>

            <button
              type="button"
              disabled={taskPage === taskTotalPages}
              onClick={() => setTaskPage((page) => page + 1)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Task Dialog */}
      <Dialog
        open={createOpen || editOpen}
        onClose={() => {
          if (!saving) {
            setCreateOpen(false);
            setEditOpen(false);
            setSelectedTask(null);
            resetForm();
          }
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{editOpen ? "Edit Task" : "Create Task"}</DialogTitle>

        <DialogContent>
          <div className="flex flex-col gap-4 pt-2">
            <TextField
              label="Task Title"
              value={formData.title}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  title: e.target.value,
                })
              }
              fullWidth
              autoFocus
            />

            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  description: e.target.value,
                })
              }
              multiline
              rows={3}
              fullWidth
            />

            <Select
              value={formData.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  status: e.target.value as TaskStatus,
                })
              }
              fullWidth
            >
              <MenuItem value="TODO">Todo</MenuItem>
              <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
              <MenuItem value="IN_REVIEW">In Review</MenuItem>
              <MenuItem value="BLOCKED">Blocked</MenuItem>
              <MenuItem value="COMPLETED">Completed</MenuItem>
            </Select>

            <Select
              value={formData.priority}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: e.target.value as TaskPriority,
                })
              }
              fullWidth
            >
              <MenuItem value="LOW">Low</MenuItem>
              <MenuItem value="MEDIUM">Medium</MenuItem>
              <MenuItem value="HIGH">High</MenuItem>
              <MenuItem value="CRITICAL">Critical</MenuItem>
            </Select>

            <Select
              value={formData.assignee}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  assignee: e.target.value,
                })
              }
              displayEmpty
              fullWidth
            >
              <MenuItem value="">Unassigned</MenuItem>

              {project.members.map((member) => (
                <MenuItem key={member._id} value={member._id}>
                  {member.name} ({member.email})
                </MenuItem>
              ))}
            </Select>

            <div className="grid grid-cols-2 gap-4">
              <TextField
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={(e) => {
                  const startDate = e.target.value;

                  setFormData({
                    ...formData,
                    startDate,
                    dueDate:
                      formData.dueDate && formData.dueDate < startDate
                        ? ""
                        : formData.dueDate,
                  });
                }}
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                }}
                fullWidth
              />

              <TextField
                label="Due Date"
                type="date"
                value={formData.dueDate}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    dueDate: e.target.value,
                  })
                }
                slotProps={{
                  inputLabel: {
                    shrink: true,
                  },
                  htmlInput: {
                    min: formData.startDate || undefined,
                  },
                }}
                fullWidth
              />
            </div>

            <TextField
              label="Labels"
              placeholder="frontend, api, urgent"
              value={formData.labels}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  labels: e.target.value,
                })
              }
              fullWidth
              helperText="Separate labels with commas"
            />

            <TextField
              label="Estimate"
              type="number"
              value={formData.estimate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  estimate: e.target.value,
                })
              }
              fullWidth
              helperText="Estimated effort"
            />

            {editOpen && selectedTask && (
              <div className="mt-2 border-t border-slate-200 pt-5">
                <h3 className="mb-3 text-lg font-semibold text-slate-900">
                  Dependencies
                </h3>
                {canManageDependencies && (
                  <div className="flex gap-2">
                    <Select
                      value={dependencyToAdd}
                      onChange={(e) => setDependencyToAdd(e.target.value)}
                      displayEmpty
                      size="small"
                      fullWidth
                    >
                      <MenuItem value="">Select a task dependency</MenuItem>

                      {tasks
                        .filter(
                          (task) =>
                            task._id !== selectedTask._id &&
                            !selectedTask.dependencies?.some(
                              (dependency) => dependency._id === task._id,
                            ),
                        )
                        .map((task) => (
                          <MenuItem key={task._id} value={task._id}>
                            {task.title}
                          </MenuItem>
                        ))}
                    </Select>

                    <Button
                      variant="contained"
                      onClick={handleAddDependency}
                      disabled={!dependencyToAdd || dependencySaving}
                    >
                      {dependencySaving ? "Adding..." : "Add"}
                    </Button>
                  </div>
                )}

                {dependencyError && (
                  <p className="mt-2 text-sm text-red-500">{dependencyError}</p>
                )}

                <div className="mt-4 space-y-2">
                  {selectedTask.dependencies?.length ? (
                    selectedTask.dependencies.map((dependency) => (
                      <div
                        key={dependency._id}
                        className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                      >
                        <div>
                          <p className="font-medium text-slate-900">
                            {dependency.title}
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            {dependency.status} • {dependency.priority}
                          </p>
                        </div>

                        {canManageDependencies && (
                          <Button
                            size="small"
                            color="error"
                            onClick={() =>
                              handleRemoveDependency(dependency._id)
                            }
                            disabled={dependencySaving}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-500">
                      No dependencies added.
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
          {editOpen && (
            <div className="mt-6 border-t border-slate-200 pt-5">
              <h3 className="mb-4 text-lg font-semibold text-slate-900">
                Comments
              </h3>

              {commentsLoading ? (
                <p className="text-sm text-slate-500">Loading comments...</p>
              ) : comments.length === 0 ? (
                <p className="text-sm text-slate-500">No comments yet.</p>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div
                      key={comment._id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-3"
                    >
                      {editingCommentId === comment._id ? (
                        <div className="space-y-2">
                          <textarea
                            value={editingCommentText}
                            onChange={(event) =>
                              setEditingCommentText(event.target.value)
                            }
                            className="w-full rounded-md border border-slate-300 p-2 text-sm outline-none focus:border-indigo-500"
                            rows={3}
                          />

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateComment(comment._id)}
                              className="rounded-md bg-indigo-600 px-3 py-1.5 text-sm text-white hover:bg-indigo-700"
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingCommentId(null);
                                setEditingCommentText("");
                              }}
                              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="mb-1 flex items-center justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {comment.author?.name || "User"}
                              </p>

                              <p className="text-xs text-slate-400">
                                {new Date(comment.createdAt).toLocaleString()}
                              </p>
                            </div>

                            {typeof comment.author !== "string" &&
                              comment.author?._id === user?._id && (
                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingCommentId(comment._id);
                                      setEditingCommentText(comment.body);
                                    }}
                                    className="text-xs text-indigo-600 hover:text-indigo-800"
                                  >
                                    Edit
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleDeleteComment(comment._id)
                                    }
                                    className="text-xs text-red-600 hover:text-red-800"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                          </div>

                          <p className="whitespace-pre-wrap text-sm text-slate-700">
                            {comment.body}
                          </p>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <textarea
                  value={commentText}
                  onChange={(event) => setCommentText(event.target.value)}
                  placeholder="Write a comment..."
                  className="w-full rounded-md border border-slate-300 p-3 text-sm outline-none focus:border-indigo-500"
                  rows={3}
                />

                <button
                  type="button"
                  onClick={handleCreateComment}
                  disabled={commentSaving || !commentText.trim()}
                  className="mt-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {commentSaving ? "Posting..." : "Add Comment"}
                </button>
              </div>
            </div>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setCreateOpen(false);
              setEditOpen(false);
              setSelectedTask(null);
              resetForm();
            }}
            disabled={saving}
          >
            Cancel
          </Button>

          <Button
            variant="contained"
            onClick={editOpen ? handleUpdateTask : handleCreateTask}
            disabled={saving}
          >
            {saving ? "Saving..." : editOpen ? "Save Changes" : "Create Task"}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default ProjectPage;
