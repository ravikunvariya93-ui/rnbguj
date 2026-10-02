import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Task from '@/models/Task';
import { auth } from '@/auth';
import { canAccessModuleServer } from '@/lib/accessServer';

function ownerId(session: unknown): string | null {
  const u = (session as { user?: { id?: string } } | null | undefined)?.user;
  return u?.id || null;
}

// GET /api/tasks?status=pending|done&limit=5 — only the logged-in user's tasks.
export async function GET(request: Request) {
  const session = await auth();
  const uid = ownerId(session);
  if (!uid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await canAccessModuleServer(session, 'tasks'))) {
    return NextResponse.json({ success: false, error: 'No task access' }, { status: 403 });
  }
  try {
    await dbConnect();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limitRaw = searchParams.get('limit');
    const query: Record<string, unknown> = { createdBy: uid };
    if (status === 'pending' || status === 'done') query.status = status;
    let cursor = Task.find(query).sort({ createdAt: -1 }).lean();
    const limit = limitRaw ? parseInt(limitRaw, 10) : 0;
    if (Number.isFinite(limit) && limit > 0) cursor = cursor.limit(Math.min(limit, 100));
    const tasks = await cursor;
    const pendingCount = await Task.countDocuments({ createdBy: uid, status: 'pending' });
    return NextResponse.json({ success: true, data: tasks, pendingCount });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 400 });
  }
}

// POST /api/tasks — user adds their own task (free-form, anything).
export async function POST(request: Request) {
  const session = await auth();
  const uid = ownerId(session);
  if (!uid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  if (!(await canAccessModuleServer(session, 'tasks'))) {
    return NextResponse.json({ success: false, error: 'No task access' }, { status: 403 });
  }
  try {
    await dbConnect();
    const body = await request.json();
    const title = String(body?.title || '').trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'Task title is required' }, { status: 400 });
    }
    const task = await Task.create({
      title: title.slice(0, 200),
      description: String(body?.description || '').trim(),
      dueDate: body?.dueDate ? new Date(body.dueDate) : null,
      status: 'pending',
      createdBy: uid,
    });
    return NextResponse.json({ success: true, data: task }, { status: 201 });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to create task' }, { status: 400 });
  }
}
