'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Loader2, ListTodo, Check } from 'lucide-react';
import { formatShortDate } from '@/lib/dateUtils';
import type { TaskItem } from './TasksCard';

export default function TasksManager({ initialTasks }: { initialTasks: TaskItem[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>(initialTasks);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const refresh = () => router.refresh();

  const addTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), description: description.trim(), dueDate: dueDate || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add task');
      setTasks((prev) => [{ ...data.data, _id: String(data.data._id) }, ...prev]);
      setTitle('');
      setDescription('');
      setDueDate('');
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add task');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (task: TaskItem) => {
    const next = task.status === 'pending' ? 'done' : 'pending';
    setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status: next } : t)));
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error('toggle failed');
      refresh();
    } catch {
      setTasks((prev) => prev.map((t) => (t._id === task._id ? { ...t, status: task.status } : t)));
    }
  };

  const remove = async (task: TaskItem) => {
    if (!confirm(`Delete task "${task.title}"?`)) return;
    const prev = tasks;
    setTasks((list) => list.filter((t) => t._id !== task._id));
    try {
      const res = await fetch(`/api/tasks/${task._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('delete failed');
      refresh();
    } catch {
      setTasks(prev);
    }
  };

  const shown = tasks.filter((t) => (filter === 'all' ? true : t.status === filter));
  const pendingCount = tasks.filter((t) => t.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ListTodo className="h-7 w-7 text-emerald-600" />
            My Tasks
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Only your tasks {pendingCount > 0 && <span className="font-bold text-amber-700">· {pendingCount} pending</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {(['all', 'pending', 'done'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold capitalize transition-all ${filter === f ? 'bg-emerald-600 text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={addTask} className="bg-white p-6 shadow-sm rounded-xl border border-slate-100 space-y-4">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Add a task — anything</h2>
        {error && <p className="text-sm text-red-600 font-medium">{error}</p>}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Task title…"
          maxLength={200}
          className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Details (optional)…"
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all disabled:opacity-60 text-sm"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Add Task
        </button>
      </form>

      <div className="bg-white shadow-sm rounded-xl border border-slate-100 overflow-hidden">
        {shown.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm text-slate-400 font-medium">
            {filter === 'all' ? 'No tasks yet. Add your first task above.' : `No ${filter} tasks.`}
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {shown.map((t) => (
              <li key={t._id} className="flex items-center gap-3 px-6 py-4 hover:bg-slate-50/50 transition-colors">
                <button
                  type="button"
                  onClick={() => toggle(t)}
                  aria-label={`Mark ${t.title} ${t.status === 'pending' ? 'done' : 'pending'}`}
                  className={`h-6 w-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${t.status === 'done' ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 hover:border-emerald-500'}`}
                >
                  {t.status === 'done' && <Check className="h-4 w-4 text-white" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold break-words ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                    {t.title}
                  </p>
                  {t.description && <p className="text-xs text-slate-500 break-words mt-0.5">{t.description}</p>}
                  {t.dueDate && <p className="text-xs text-slate-400 font-medium mt-0.5">Due {formatShortDate(t.dueDate)}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => remove(t)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title="Delete task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
