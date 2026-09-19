import { useEffect, useMemo, useState } from "react";
import { Button } from "@mui/material";

import { getCalendarTasks } from "../api/task";
import type { Task } from "../api/task";

interface CalendarViewProps {
  projectId: string;
  onEditTask: (task: Task) => void;
}

const CalendarView = ({ projectId, onEditTask }: CalendarViewProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const calendarStart = new Date(firstDay);
  calendarStart.setDate(firstDay.getDate() - firstDay.getDay());

  const calendarEnd = new Date(lastDay);
  calendarEnd.setDate(lastDay.getDate() + (6 - lastDay.getDay()));

  const formatDate = (date: Date) => {
    return date.toISOString().split("T")[0];
  };

  const loadTasks = async () => {
    try {
      setLoading(true);

      const data = await getCalendarTasks(
        projectId,
        formatDate(calendarStart),
        formatDate(calendarEnd),
      );

      setTasks(data);
    } catch (error) {
      console.error("Failed to load calendar tasks", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, [projectId, year, month]);

  const days = useMemo(() => {
    const result: Date[] = [];

    const date = new Date(calendarStart);

    while (date <= calendarEnd) {
      result.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }

    return result;
  }, [year, month]);

  const getTasksForDay = (date: Date) => {
    const dateString = formatDate(date);

    return tasks.filter((task) => {
      if (!task.dueDate) return false;

      return formatDate(new Date(task.dueDate)) === dateString;
    });
  };

  const goToPreviousMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const isToday = (date: Date) => {
    const today = new Date();

    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month;
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {/* Calendar Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
        <h2 className="text-lg font-semibold text-slate-900">
          {currentDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric",
          })}
        </h2>

        <div className="flex gap-2">
          <Button size="small" variant="outlined" onClick={goToPreviousMonth}>
            ←
          </Button>

          <Button size="small" variant="outlined" onClick={goToToday}>
            Today
          </Button>

          <Button size="small" variant="outlined" onClick={goToNextMonth}>
            →
          </Button>
        </div>
      </div>

      {/* Week Days */}
      <div className="grid grid-cols-7 border-b border-slate-200">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="border-r border-slate-200 p-3 text-center text-xs font-semibold text-slate-500 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar */}
      {loading ? (
        <div className="flex min-h-[500px] items-center justify-center">
          <p className="text-sm text-slate-500">Loading calendar...</p>
        </div>
      ) : (
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const dayTasks = getTasksForDay(day);

            return (
              <div
                key={day.toISOString()}
                className={`min-h-[130px] border-b border-r border-slate-200 p-2 ${
                  !isCurrentMonth(day) ? "bg-slate-50" : "bg-white"
                }`}
              >
                {/* Date */}
                <div className="mb-2 flex justify-end">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${
                      isToday(day)
                        ? "bg-indigo-600 font-semibold text-white"
                        : isCurrentMonth(day)
                          ? "text-slate-700"
                          : "text-slate-400"
                    }`}
                  >
                    {day.getDate()}
                  </span>
                </div>

                {/* Tasks */}
                <div className="space-y-1">
                  {dayTasks.map((task) => (
                    <button
                      key={task._id}
                      type="button"
                      onClick={() => onEditTask(task)}
                      className="w-full rounded-md bg-indigo-50 px-2 py-1.5 text-left text-xs text-indigo-700 hover:bg-indigo-100"
                    >
                      <div className="truncate font-medium">{task.title}</div>

                      <div className="mt-0.5 text-[10px] text-indigo-500">
                        {task.priority}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CalendarView;
