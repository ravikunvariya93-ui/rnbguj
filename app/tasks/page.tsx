import { redirect } from 'next/navigation';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { auth } from '@/auth';
import { canAccessModuleServer } from '@/lib/accessServer';
import TasksManager from '@/components/TasksManager';
import type { TaskItem } from '@/components/TasksCard';

export const dynamic = 'force-dynamic';

export default async function TasksPage() {
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) redirect('/login');
  if (!(await canAccessModuleServer(session, 'tasks'))) {
    return (
      <div className="bg-white p-8 shadow-sm rounded-xl border border-slate-100 text-center">
        <p className="text-sm font-semibold text-slate-600">Your role does not have access to Tasks. Please re-login; if the problem persists, contact your administrator.</p>
      </div>
    );
  }
  await dbConnect();
  const docs = await Task.find({ createdBy: uid }).sort({ createdAt: -1 }).lean();
  const initialTasks: TaskItem[] = docs.map((d) => ({
    _id: String((d as { _id: unknown })._id),
    title: (d as { title?: string }).title || '',
    description: (d as { description?: string }).description || '',
    status: ((d as { status?: string }).status === 'done' ? 'done' : 'pending') as TaskItem['status'],
    dueDate: (d as { dueDate?: Date | null }).dueDate ? new Date((d as { dueDate: Date }).dueDate).toISOString() : null,
  }));
  return <TasksManager initialTasks={initialTasks} />;
}
