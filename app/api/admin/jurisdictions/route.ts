import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Jurisdiction from '@/models/Jurisdiction';
import { auth } from '@/auth';
import { OFFICE_TYPES } from '@/lib/access';
import { ensureAccessSeeded } from '@/lib/accessServer';

import { isAdminSession } from '@/lib/accessServer';

async function isAdmin(session: unknown): Promise<boolean> {
  return isAdminSession(session);
}

function isValidId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

async function resolveParent(parent: unknown, selfId?: string): Promise<string | null> {
  if (!parent) return null;
  if (!isValidId(String(parent)) || String(parent) === selfId) {
    throw new Error('Invalid parent jurisdiction');
  }
  const parentDoc = await Jurisdiction.findById(String(parent)).lean() as unknown as { type?: string } | null;
  if (!parentDoc) {
    throw new Error('Parent jurisdiction not found');
  }
  if (parentDoc.type !== OFFICE_TYPES.DIVISION) {
    throw new Error('Parent must be a Division jurisdiction');
  }
  return String(parent);
}

export async function GET() {
  const session = await auth();
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await dbConnect();
    await ensureAccessSeeded();
    const items = await Jurisdiction.find({}).sort({ type: 1, name: 1 }).lean();
    return NextResponse.json(items);
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
    const { name, type, matchKey, parent } = await req.json();
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Jurisdiction name is required' }, { status: 400 });
    }
    const jurisdictionType = type === OFFICE_TYPES.DIVISION ? OFFICE_TYPES.DIVISION : OFFICE_TYPES.SUB_DIVISION;
    const matchKeyValue = String(matchKey || name).trim();
    if (!matchKeyValue) {
      return NextResponse.json({ error: 'Match key is required' }, { status: 400 });
    }
    await dbConnect();
    await ensureAccessSeeded();
    const clash = await Jurisdiction.findOne({
      $or: [
        { name: String(name).trim(), type: jurisdictionType },
        { matchKey: matchKeyValue, type: jurisdictionType },
      ],
    }).lean();
    if (clash) {
      return NextResponse.json({ error: 'Jurisdiction name (for this level) or match key already exists' }, { status: 400 });
    }
    let parentId: string | null = null;
    try {
      parentId = await resolveParent(parent);
    } catch (e: unknown) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'Invalid parent' }, { status: 400 });
    }
    const item = await Jurisdiction.create({
      name: String(name).trim(),
      type: jurisdictionType,
      matchKey: matchKeyValue,
      parent: parentId,
    });
    return NextResponse.json(item, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
