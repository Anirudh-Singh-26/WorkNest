import { useEffect, useMemo, useRef, useState } from "react";

import { getTimelineTasks, updateTask } from "../api/task";
import type { Task } from "../api/task";
import { socket } from "../socket/socket";

interface TimelineViewProps {
  projectId: string;
  onEditTask: (task: Task) => void;
}

type DragMode = "move" | "resize-left" | "resize-right";

interface DragState {
  taskId: string;
  mode: DragMode;
  startX: number;
  originalStart: string | null;
  originalEnd: string | null;
}

const TimelineView = ({ projectId, onEditTask }: TimelineViewProps) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [currentDate, setCurrentDate] = useState(new Date());

  /*
   * IMPORTANT:
   * Keep the latest tasks available to pointerup.
   * Otherwise pointerup can use an old tasks state.
   */
  const tasksRef = useRef<Task[]>([]);

  /*
   * This ref belongs to the actual timeline area,
   * NOT each individual task row.
   */
  const timelineRef = useRef<HTMLDivElement | null>(null);

  const dragRef = useRef<DragState | null>(null);
  const draggedRef = useRef(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);

  const daysInMonth = monthEnd.getDate();

  const days = useMemo(() => {
    return Array.from(
      { length: daysInMonth },
      (_, index) => new Date(year, month, index + 1),
    );
  }, [year, month, daysInMonth]);

  const setTaskList = (nextTasks: Task[]) => {
    tasksRef.current = nextTasks;
    setTasks(nextTasks);
  };

  const formatDate = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  };

  const parseDate = (value: string | null | undefined): Date | null => {
    if (!value) {
      return null;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return null;
    }

    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const addDays = (date: Date, amount: number) => {
    const result = new Date(date);

    result.setDate(result.getDate() + amount);

    return result;
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getTimelineTasks(
        projectId,
        formatDate(monthStart),
        formatDate(monthEnd),
      );

      setTaskList(data);
    } catch (error) {
      console.error("Failed to load timeline tasks", error);

      setError("Failed to load timeline.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [projectId, year, month]);

  /*
   * Realtime updates
   */
  useEffect(() => {
    const handleTaskUpdated = (updatedTask: Task) => {
      setTasks((currentTasks) => {
        const exists = currentTasks.some(
          (task) => task._id === updatedTask._id,
        );

        if (!exists) {
          return currentTasks;
        }

        const nextTasks = currentTasks.map((task) =>
          task._id === updatedTask._id ? updatedTask : task,
        );

        tasksRef.current = nextTasks;

        return nextTasks;
      });
    };

    const handleTaskMoved = (updatedTask: Task) => {
      handleTaskUpdated(updatedTask);
    };

    socket.on("task.updated", handleTaskUpdated);

    socket.on("task.moved", handleTaskMoved);

    return () => {
      socket.off("task.updated", handleTaskUpdated);

      socket.off("task.moved", handleTaskMoved);
    };
  }, []);

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getTaskPosition = (task: Task) => {
    if (!task.startDate && !task.dueDate) {
      return null;
    }

    const taskStart =
      parseDate(task.startDate) || parseDate(task.dueDate) || monthStart;

    const taskEnd =
      parseDate(task.dueDate) || parseDate(task.startDate) || monthEnd;

    if (taskEnd < monthStart || taskStart > monthEnd) {
      return null;
    }

    const visibleStart = taskStart < monthStart ? monthStart : taskStart;

    const visibleEnd = taskEnd > monthEnd ? monthEnd : taskEnd;

    const startDay = visibleStart.getDate();
    const endDay = visibleEnd.getDate();

    const left = ((startDay - 1) / daysInMonth) * 100;

    const width = ((endDay - startDay + 1) / daysInMonth) * 100;

    return {
      left: `${left}%`,
      width: `${Math.max(width, 3)}%`,
    };
  };

  /*
   * Calculate how many days the mouse moved.
   */
  const getDayDelta = (clientX: number, startX: number) => {
    if (!timelineRef.current) {
      return 0;
    }

    const width = timelineRef.current.getBoundingClientRect().width;

    const dayWidth = width / daysInMonth;

    if (!dayWidth) {
      return 0;
    }

    return Math.round((clientX - startX) / dayWidth);
  };

  /*
   * Start dragging.
   */
  const handlePointerDown = (
    event: React.PointerEvent,
    task: Task,
    mode: DragMode,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (savingTaskId) {
      return;
    }

    draggedRef.current = false;

    dragRef.current = {
      taskId: task._id,
      mode,
      startX: event.clientX,
      originalStart: task.startDate || null,
      originalEnd: task.dueDate || null,
    };

    document.body.style.userSelect = "none";

    document.addEventListener("pointermove", handlePointerMove);

    document.addEventListener("pointerup", handlePointerUp);
  };

  /*
   * Update the UI while dragging.
   */
  const handlePointerMove = (event: PointerEvent) => {
    const drag = dragRef.current;

    if (!drag) {
      return;
    }

    const deltaDays = getDayDelta(event.clientX, drag.startX);

    if (deltaDays !== 0) {
      draggedRef.current = true;
    }

    const originalStart = parseDate(drag.originalStart);

    const originalEnd = parseDate(drag.originalEnd);

    const nextTasks = tasksRef.current.map((task) => {
      if (task._id !== drag.taskId) {
        return task;
      }

      let newStart = originalStart;
      let newEnd = originalEnd;

      /*
       * Move the complete task.
       */
      if (drag.mode === "move") {
        if (originalStart) {
          newStart = addDays(originalStart, deltaDays);
        }

        if (originalEnd) {
          newEnd = addDays(originalEnd, deltaDays);
        }
      }

      /*
       * Resize from left.
       */
      if (drag.mode === "resize-left" && originalStart) {
        newStart = addDays(originalStart, deltaDays);

        if (newEnd && newStart > newEnd) {
          newStart = newEnd;
        }
      }

      /*
       * Resize from right.
       */
      if (drag.mode === "resize-right" && originalEnd) {
        newEnd = addDays(originalEnd, deltaDays);

        if (newStart && newEnd < newStart) {
          newEnd = newStart;
        }
      }

      return {
        ...task,

        startDate: newStart ? formatDate(newStart) : task.startDate,

        dueDate: newEnd ? formatDate(newEnd) : task.dueDate,
      };
    });

    tasksRef.current = nextTasks;
    setTasks(nextTasks);
  };

  /*
   * Save the final dragged position.
   */
  const handlePointerUp = async () => {
    const drag = dragRef.current;

    dragRef.current = null;

    document.body.style.userSelect = "";

    document.removeEventListener("pointermove", handlePointerMove);

    document.removeEventListener("pointerup", handlePointerUp);

    if (!drag || !draggedRef.current) {
      return;
    }

    /*
     * VERY IMPORTANT:
     * Get the latest task from the ref,
     * not from the old React state.
     */
    const task = tasksRef.current.find((item) => item._id === drag.taskId);

    if (!task) {
      return;
    }

    try {
      setSavingTaskId(task._id);
      setError("");

      const updatedTask = await updateTask(task._id, {
        startDate: task.startDate,
        dueDate: task.dueDate,
        version: task.version,
      });

      const nextTasks = tasksRef.current.map((item) =>
        item._id === updatedTask._id ? updatedTask : item,
      );

      tasksRef.current = nextTasks;
      setTasks(nextTasks);
    } catch (error: any) {
      console.error("Failed to update timeline task", error);

      setError(
        error?.response?.data?.message || "Failed to save timeline change.",
      );

      /*
       * Backend rejected the change,
       * so reload the real database value.
       */
      await loadTasks();
    } finally {
      setSavingTaskId(null);

      setTimeout(() => {
        setError("");
      }, 3000);
    }

    draggedRef.current = false;
  };

  const handleTaskClick = (event: React.MouseEvent, task: Task) => {
    if (draggedRef.current) {
      event.preventDefault();
      event.stopPropagation();

      draggedRef.current = false;

      return;
    }

    onEditTask(task);
  };

  /*
   * Dependency conflict detection.
   */
  const getDependencyConflicts = (task: Task) => {
    if (!task.startDate || !task.dependencies?.length) {
      return [];
    }

    const taskStart = parseDate(task.startDate);

    if (!taskStart) {
      return [];
    }

    return task.dependencies.filter((dependency: any) => {
      if (!dependency.dueDate) {
        return false;
      }

      const dependencyEnd = parseDate(dependency.dueDate);

      return dependencyEnd !== null && dependencyEnd > taskStart;
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-xl border border-slate-200 bg-white">
        <p className="text-sm text-slate-500">Loading timeline...</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-200 p-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            {currentDate.toLocaleDateString("en-US", {
              month: "long",
              year: "numeric",
            })}
          </h2>

          <p className="mt-1 text-xs text-slate-400">
            Drag a task to move it • Drag the edges to resize
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            ←
          </button>

          <button
            type="button"
            onClick={goToToday}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            Today
          </button>

          <button
            type="button"
            onClick={goToNextMonth}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50"
          >
            →
          </button>
        </div>
      </div>

      {error && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}

      {tasks.length === 0 ? (
        <div className="p-10 text-center">
          <h3 className="font-semibold text-slate-900">No timeline tasks</h3>

          <p className="mt-1 text-sm text-slate-500">
            Tasks need start or due dates to appear here.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[1100px]">
            {/* Date header */}
            <div className="grid grid-cols-[220px_1fr] border-b border-slate-200">
              <div className="border-r border-slate-200 p-3 text-sm font-medium text-slate-600">
                Task
              </div>

              <div
                ref={timelineRef}
                className="relative grid grid-cols-[repeat(31,minmax(35px,1fr))]"
              >
                {days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="border-r border-slate-100 p-2 text-center text-[10px] text-slate-400"
                  >
                    {day.getDate()}
                  </div>
                ))}
              </div>
            </div>

            {/* Tasks */}
            {tasks.map((task) => {
              const position = getTaskPosition(task);

              if (!position) {
                return null;
              }

              const conflicts = getDependencyConflicts(task);

              const isSaving = savingTaskId === task._id;

              return (
                <div
                  key={task._id}
                  className="grid h-[70px] grid-cols-[220px_1fr] border-b border-slate-100"
                >
                  {/* Task information */}
                  <button
                    type="button"
                    onClick={(event) => handleTaskClick(event, task)}
                    className="border-r border-slate-200 px-3 py-3 text-left hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {task.title}
                      </p>

                      {conflicts.length > 0 && (
                        <span
                          className="text-amber-500"
                          title="Dependency conflict"
                        >
                          ⚠
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs text-slate-400">
                      {task.status.replace("_", " ")}
                    </p>
                  </button>

                  {/* Timeline */}
                  <div className="relative min-h-[70px]">
                    {/* Grid */}
                    <div className="absolute inset-0 grid grid-cols-[repeat(31,minmax(35px,1fr))]">
                      {days.map((day) => (
                        <div
                          key={day.toISOString()}
                          className="border-r border-slate-100"
                        />
                      ))}
                    </div>

                    {/* Task bar */}
                    <div
                      className={`absolute top-5 z-30 h-8 rounded-md bg-indigo-500 shadow-sm ${
                        isSaving ? "cursor-wait opacity-60" : "cursor-grab"
                      }`}
                      style={{
                        left: position.left,
                        width: position.width,
                      }}
                      onPointerDown={(event) =>
                        handlePointerDown(event, task, "move")
                      }
                      onClick={(event) => handleTaskClick(event, task)}
                    >
                      {/* Left resize */}
                      {task.startDate && (
                        <div
                          className="absolute left-0 top-0 z-40 h-full w-3 cursor-ew-resize"
                          onPointerDown={(event) =>
                            handlePointerDown(event, task, "resize-left")
                          }
                        />
                      )}

                      <span className="pointer-events-none block truncate px-3 py-1.5 text-xs font-medium text-white">
                        {task.title}
                      </span>

                      {/* Right resize */}
                      {task.dueDate && (
                        <div
                          className="absolute right-0 top-0 z-40 h-full w-3 cursor-ew-resize"
                          onPointerDown={(event) =>
                            handlePointerDown(event, task, "resize-right")
                          }
                        />
                      )}
                    </div>

                    {conflicts.length > 0 && (
                      <div className="absolute bottom-1 left-2 z-10 text-[10px] text-amber-600">
                        Dependency conflict
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default TimelineView;
