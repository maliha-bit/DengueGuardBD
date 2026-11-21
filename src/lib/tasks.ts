import type { PreventionTask, TaskColumn } from '@/api/types';

/** Board columns, left to right. */
export const TASK_COLUMNS: TaskColumn[] = [
  'open',
  'in_progress',
  'completed',
  'cancelled',
  'overdue',
];

type TaskDates = Pick<PreventionTask, 'status' | 'dueDate'>;

/**
 * Overdue = the due date (yyyy-mm-dd) is before today and the task is still being worked on
 * (open or in progress). Completed and cancelled tasks are never overdue.
 */
export function isOverdue(task: TaskDates, today: string): boolean {
  return (task.status === 'open' || task.status === 'in_progress') && task.dueDate < today;
}

export function taskColumn(task: TaskDates, today: string): TaskColumn {
  return isOverdue(task, today) ? 'overdue' : task.status;
}

export function groupTasks<T extends TaskDates>(
  tasks: T[],
  today: string,
): Record<TaskColumn, T[]> {
  const groups: Record<TaskColumn, T[]> = {
    open: [],
    in_progress: [],
    completed: [],
    cancelled: [],
    overdue: [],
  };
  for (const task of tasks) groups[taskColumn(task, today)].push(task);
  return groups;
}
