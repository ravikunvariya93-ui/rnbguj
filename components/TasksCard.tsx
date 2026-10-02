'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ListTodo, ArrowRight } from 'lucide-react';
import { formatShortDate } from '@/lib/dateUtils';

export interface TaskItem {
  _id: string;
  title: string;
  description?: string;
  status: 'pending' | 'done';
  dueDate?: string | null;
}

export default function TasksCard() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    fetch('/api/tasks?limit=50')
      .then((r) => {
        if (r.status === 401 || r.status === 403) {
          setHidden(true);
          return null;
        }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        const list: TaskItem[] = Array.isArray(data.data) ? data.data : [];
        setTasks(list);
        setPendingCount(typeof data.pendingCount === 'number' ? data.pendingCount : list.filter((t) => t.status === 'pending').length);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  const toggle = async (task: TaskItem) => {
    const next = task.status === 'pending' ? 'done' : 'pending';
    setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status: next as TaskItem['status'] } : t)));
    setPendingCount((c) => c + (next === 'done' ? -1 : 1));
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error('toggle failed');
    } catch {
      // Revert on failure
      setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status: task.status } : t)));
      setPendingCount((c) => c + (next === 'done' ? 1 : -1));
    }
  };

  if (hidden) return null;

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add task');
      setTasks((prev) => [{ ...data.data, _id: String(data.data._id) }, ...prev]);
      setPendingCount((c) => c + 1);
      setNewTitle('');
    } catch {
      // keep input so the user can retry
    } finally {
      setAdding(false);
    }
  };

  const visible = [...tasks]
    .sort((a, b) => (a.status === b.status ? 0 : a.status === 'pending' ? -1 : 1))
    .slice(0, 6);

  return (
    <div className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-4 lg:w-1/2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-600 p-2 rounded-xl shadow-sm">
            <ListTodo className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg font-bold text-slate-800 tracking-tight">My Tasks</h2>
            <p className="text-xs text-slate-500 font-medium">Only your tasks — anything you add yourself</p>
          </div>
        </div>
        {pendingCount > 0 && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            {pendingCount} pending
          </span>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 bg-slate-100 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : (
        <>
          <form onSubmit={addTask} className="flex gap-2">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Add a task…"
              maxLength={200}
              className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={adding || !newTitle.trim()}
              className="px-4 py-2 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-50 flex-shrink-0"
            >
              Add
            </button>
          </form>
          {visible.length === 0 ? (
            <p className="text-sm text-slate-400 font-medium py-2">No tasks yet. Add your first task above.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {visible.map((t) => (
                <li key={t._id} className="flex items-center gap-3 py-2.5">
                  <input
                    type="checkbox"
                    checked={t.status === 'done'}
                    onChange={() => toggle(t)}
                    className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    aria-label={`Mark ${t.title} ${t.status === 'pending' ? 'done' : 'pending'}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                      {t.title}
                    </p>
                    {t.dueDate && (
                      <p className="text-xs text-slate-400 font-medium">Due {formatShortDate(t.dueDate)}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      <Link
        href="/tasks"
        className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
      >
        View all Tasks
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
