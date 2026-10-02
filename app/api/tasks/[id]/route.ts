import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { auth } from '@/auth';
import { canAccessModuleServer } from '@/lib/accessServer';

function ownerId(session: unknown): string | null {
  const u = (session as { user?: { id?: string } } | null | undefined)?.user;
  return u?.id || null;
}

// PATCH /api/tasks/:id — toggle/edit only your own task.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const uid = ownerId(session);
  if (!uid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await canAccessModuleServer(session, 'tasks'))) {
    return NextResponse.json({ success: false, error: 'No task access' }, { status: 403 });
  }
  const { id } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json({ success: false, error: 'Invalid task id' }, { status: 400 });
  }
  try {
    await dbConnect();
    const body = await req.json();
    const update: Record<string, unknown> = {};
    if (body?.title !== undefined) {
      const title = String(body.title).trim();
      if (!title) {
        return NextResponse.json({ success: false, error: 'Task title cannot be empty' }, { status: 400 });
      }
      update.title = title.slice(0, 200);
    }
    if (body?.description !== undefined) update.description = String(body.description).trim();
    if (body?.status !== undefined) {
      if (body.status !== 'pending' && body.status !== 'done') {
        return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
      }
      update.status = body.status;
    }
    if (body?.dueDate !== undefined) update.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    const task = await Task.findOneAndUpdate({ _id: id, createdBy: uid }, update, { new: true }).lean();
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: task });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to update task' }, { status: 400 });
  }
}

// DELETE /api/tasks/:id — delete only your own task.
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const uid = ownerId(session);
  if (!uid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await canAccessModuleServer(session, 'tasks'))) {
    return NextResponse.json({ success: false, error: 'No task access' }, { status: 403 });
  }
  const { id } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json({ success: false, error: 'Invalid task id' }, { status: 400 });
  }
  try {
    await dbConnect();
    const task = await Task.findOneAndDelete({ _id: id, createdBy: uid });
    if (!task) {
      return NextResponse.json({ success: false, error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: 'Task deleted' });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to delete task' }, { status: 400 });
  }
}
