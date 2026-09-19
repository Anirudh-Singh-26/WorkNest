import { useState } from "react";

import { moveTask } from "../api/task";
import type { Task, TaskStatus } from "../api/task";

interface KanbanBoardProps {
  tasks: Task[];
  setTasks: React.Dispatch<React.SetStateAction<Task[]>>;
  onEditTask?: (task: Task) => void;
  onArchiveTask?: (task: Task) => void;
  onDeleteTask?: (task: Task) => void;
  selectedTaskIds: string[];
  onToggleTaskSelection: (taskId: string) => void;
}

const columns: {
  status: TaskStatus;
  title: string;
}[] = [
  { status: "TODO", title: "Todo" },
  { status: "IN_PROGRESS", title: "In Progress" },
  { status: "IN_REVIEW", title: "In Review" },
  { status: "BLOCKED", title: "Blocked" },
  { status: "COMPLETED", title: "Completed" },
];

const KanbanBoard = ({
  tasks,
  setTasks,
  onEditTask,
  onArchiveTask,
  onDeleteTask,
  selectedTaskIds,
  onToggleTaskSelection,
}: KanbanBoardProps) => {
  const [draggedTask, setDraggedTask] = useState<Task | null>(null);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);

  const handleDragStart = (task: Task) => {
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = async (
    event: React.DragEvent<HTMLDivElement>,
    status: TaskStatus,
  ) => {
    event.preventDefault();

    if (!draggedTask) return;

    if (draggedTask.status === status) {
      setDraggedTask(null);
      return;
    }

    const previousTasks = tasks;

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task._id === draggedTask._id
          ? {
              ...task,
              status,
              version: task.version + 1,
            }
          : task,
      ),
    );

    setMovingTaskId(draggedTask._id);
    setDraggedTask(null);

    try {
      const targetTasks = tasks.filter(
        (task) => task.status === status && task._id !== draggedTask._id,
      );

      const order = targetTasks.length;

      const updatedTask = await moveTask(draggedTask._id, {
        status,
        order,
        version: draggedTask.version,
      });

      setTasks((currentTasks) =>
        currentTasks.map((task) =>
          task._id === updatedTask._id ? updatedTask : task,
        ),
      );
    } catch (error: any) {
      console.error("Failed to move task", error);

      setTasks(previousTasks);

      alert(error.response?.data?.message || "Failed to move task");
    } finally {
      setMovingTaskId(null);
    }
  };

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="grid min-w-[1100px] grid-cols-5 gap-4">
        {columns.map((column) => {
          const columnTasks = tasks.filter(
            (task) => task.status === column.status,
          );

          return (
            <div
              key={column.status}
              className="min-w-0 rounded-xl bg-slate-100 p-3"
              onDragOver={handleDragOver}
              onDrop={(event) => handleDrop(event, column.status)}
            >
              {/* Column Header */}
              <div className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-sm font-semibold text-slate-800">
                  {column.title}
                </h3>

                <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-medium text-slate-500">
                  {columnTasks.length}
                </span>
              </div>

              {/* Tasks */}
              <div className="min-h-[150px] space-y-3">
                {columnTasks.map((task) => (
                  <div
                    key={task._id}
                    draggable
                    onDragStart={() => handleDragStart(task)}
                    onDragEnd={handleDragEnd}
                    className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md ${
                      movingTaskId === task._id
                        ? "opacity-50"
                        : "cursor-grab active:cursor-grabbing"
                    }`}
                  >
                    {/* Title + Priority */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-2">
                        <input
                          type="checkbox"
                          checked={selectedTaskIds.includes(task._id)}
                          onChange={() => onToggleTaskSelection(task._id)}
                          onClick={(event) => event.stopPropagation()}
                          className="mt-1 shrink-0"
                        />

                        <h4 className="break-words text-sm font-medium text-slate-900">
                          {task.title}
                        </h4>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                          task.priority === "CRITICAL"
                            ? "bg-red-100 text-red-700"
                            : task.priority === "HIGH"
                              ? "bg-orange-100 text-orange-700"
                              : task.priority === "MEDIUM"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-green-100 text-green-700"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    {/* Description */}
                    {task.description && (
                      <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">
                        {task.description}
                      </p>
                    )}

                    {/* Labels */}
                    {task.labels.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {task.labels.map((label) => (
                          <span
                            key={label}
                            className="rounded bg-indigo-50 px-2 py-1 text-[10px] text-indigo-600"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Bottom Section */}
                    <div className="mt-4 border-t border-slate-100 pt-3">
                      {/* Assignee */}
                      <div className="mb-2">
                        {task.assignee ? (
                          <span className="text-xs text-slate-500">
                            {task.assignee.name}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            Unassigned
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      {(onEditTask || onArchiveTask || onDeleteTask) && (
                        <div className="flex flex-wrap gap-1">
                          {onEditTask && (
                            <button
                              type="button"
                              onClick={() => onEditTask(task)}
                              className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                            >
                              Edit
                            </button>
                          )}

                          {onArchiveTask && (
                            <button
                              type="button"
                              onClick={() => onArchiveTask(task)}
                              className="rounded px-2 py-1 text-xs font-medium text-orange-600 hover:bg-orange-50"
                            >
                              Archive
                            </button>
                          )}

                          {onDeleteTask && (
                            <button
                              type="button"
                              onClick={() => onDeleteTask(task)}
                              className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Due Date */}
                    {task.dueDate && (
                      <p className="mt-2 text-xs text-slate-400">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ))}

                {columnTasks.length === 0 && (
                  <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-dashed border-slate-300">
                    <p className="text-xs text-slate-400">Drop tasks here</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default KanbanBoard;
