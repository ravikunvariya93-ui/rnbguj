import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Role from '@/models/Role';
import { auth } from '@/auth';
import { sanitizeModules } from '@/lib/access';
import { ensureAccessSeeded } from '@/lib/accessServer';

import { isAdminSession } from '@/lib/accessServer';

async function isAdmin(session: unknown): Promise<boolean> {
  return isAdminSession(session);
}

export async function GET() {
  const session = await auth();
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await dbConnect();
    await ensureAccessSeeded();
    const roles = await Role.find({}).sort({ key: 1 }).lean();
    return NextResponse.json(roles);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { key, label, modules } = await req.json();
    if (!key || !label) {
      return NextResponse.json({ error: 'Role key and label are required' }, { status: 400 });
    }
    const roleKey = String(key).toUpperCase().trim();
    if (!/^[A-Z0-9_]+$/.test(roleKey)) {
      return NextResponse.json({ error: 'Role key may only contain A–Z, 0–9 and underscore' }, { status: 400 });
    }
    await dbConnect();
    await ensureAccessSeeded();
    const existing = await Role.findOne({ key: roleKey }).lean();
    if (existing) {
      return NextResponse.json({ error: 'Role key already exists' }, { status: 400 });
    }
    const role = await Role.create({
      key: roleKey,
      label: String(label).trim(),
      modules: sanitizeModules(modules),
      isSystem: false,
    });
    return NextResponse.json(role, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
