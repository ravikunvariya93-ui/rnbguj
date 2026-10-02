import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Role from '@/models/Role';
import User from '@/models/User';
import { auth } from '@/auth';
import { sanitizeModules } from '@/lib/access';

import { isAdminSession } from '@/lib/accessServer';

async function isAdmin(session: unknown): Promise<boolean> {
  return isAdminSession(session);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid role id' }, { status: 400 });
  }
  try {
    const { label, modules } = await req.json();
    await dbConnect();
    const updateData: { label?: string; modules?: string[] } = {};
    if (label !== undefined) {
      if (!String(label).trim()) {
        return NextResponse.json({ error: 'Role label cannot be empty' }, { status: 400 });
      }
      updateData.label = String(label).trim();
    }
    if (modules !== undefined) updateData.modules = sanitizeModules(modules);
    const role = await Role.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    return NextResponse.json(role);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid role id' }, { status: 400 });
  }
  try {
    await dbConnect();
    const role = await Role.findById(id).lean() as unknown as { key: string } | null;
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }
    const inUse = await User.countDocuments({ role: role.key });
    if (inUse > 0) {
      return NextResponse.json({ error: `Role is assigned to ${inUse} user(s) and cannot be deleted` }, { status: 400 });
    }
    await Role.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Role deleted successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
