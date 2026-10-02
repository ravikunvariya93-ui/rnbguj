import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Jurisdiction from '@/models/Jurisdiction';
import User from '@/models/User';
import { auth } from '@/auth';
import { OFFICE_TYPES } from '@/lib/access';

import { isAdminSession } from '@/lib/accessServer';

async function isAdmin(session: unknown): Promise<boolean> {
  return isAdminSession(session);
}

function isValidId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!(await isAdmin(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { id } = await params;
  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Invalid jurisdiction id' }, { status: 400 });
  }
  try {
    const { name, type, matchKey, parent } = await req.json();
    if (!name || !String(name).trim()) {
      return NextResponse.json({ error: 'Jurisdiction name cannot be empty' }, { status: 400 });
    }
    await dbConnect();
    const current = await Jurisdiction.findById(id).lean() as unknown as { name: string; type?: string } | null;
    if (!current) {
      return NextResponse.json({ error: 'Jurisdiction not found' }, { status: 404 });
    }
    const newName = String(name).trim();
    const newType = type === OFFICE_TYPES.DIVISION || type === OFFICE_TYPES.SUB_DIVISION ? type : current.type;
    const duplicate = await Jurisdiction.findOne({ name: newName, type: newType, _id: { $ne: id } }).lean();
    if (duplicate) {
      return NextResponse.json({ error: 'Jurisdiction already exists for this level' }, { status: 400 });
    }
    const updateData: { name: string; type?: string; matchKey?: string; parent?: string | null } = { name: newName };
    if (type === OFFICE_TYPES.DIVISION || type === OFFICE_TYPES.SUB_DIVISION) {
      updateData.type = type;
    }
    if (matchKey !== undefined) {
      const matchKeyValue = String(matchKey || '').trim();
      if (!matchKeyValue) {
        return NextResponse.json({ error: 'Match key cannot be empty' }, { status: 400 });
      }
      const keyClash = await Jurisdiction.findOne({ matchKey: matchKeyValue, type: newType, _id: { $ne: id } }).lean();
      if (keyClash) {
        return NextResponse.json({ error: 'Match key already exists' }, { status: 400 });
      }
      updateData.matchKey = matchKeyValue;
    }
    if (parent !== undefined) {
      if (!parent) {
        updateData.parent = null;
      } else {
        if (!isValidId(String(parent)) || String(parent) === id) {
          return NextResponse.json({ error: 'Invalid parent jurisdiction' }, { status: 400 });
        }
        const parentDoc = await Jurisdiction.findById(String(parent)).lean() as unknown as { type?: string } | null;
        if (!parentDoc) {
          return NextResponse.json({ error: 'Parent jurisdiction not found' }, { status: 400 });
        }
        if (parentDoc.type !== OFFICE_TYPES.DIVISION) {
          return NextResponse.json({ error: 'Parent must be a Division jurisdiction' }, { status: 400 });
        }
        updateData.parent = String(parent);
      }
    }
    // Keep assigned users pointing at the renamed jurisdiction.
    // Skipped when the old name is shared with another level (ambiguous).
    if (newName !== current.name) {
      const shared = await Jurisdiction.countDocuments({ name: current.name, _id: { $ne: id } });
      if (shared === 0) {
        await User.updateMany({ jurisdiction: current.name }, { $set: { jurisdiction: newName } });
      }
    }
    const item = await Jurisdiction.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    return NextResponse.json(item);
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
  if (!isValidId(id)) {
    return NextResponse.json({ error: 'Invalid jurisdiction id' }, { status: 400 });
  }
  try {
    await dbConnect();
    const item = await Jurisdiction.findById(id).lean() as unknown as { name: string } | null;
    if (!item) {
      return NextResponse.json({ error: 'Jurisdiction not found' }, { status: 404 });
    }
    const [inUse, hasChildren] = await Promise.all([
      User.countDocuments({ jurisdiction: item.name }),
      Jurisdiction.countDocuments({ parent: id }),
    ]);
    if (inUse > 0) {
      return NextResponse.json({ error: `Jurisdiction is assigned to ${inUse} user(s) and cannot be deleted` }, { status: 400 });
    }
    if (hasChildren > 0) {
      return NextResponse.json({ error: `Jurisdiction heads ${hasChildren} sub-division(s) and cannot be deleted` }, { status: 400 });
    }
    await Jurisdiction.findByIdAndDelete(id);
    return NextResponse.json({ message: 'Jurisdiction deleted successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
