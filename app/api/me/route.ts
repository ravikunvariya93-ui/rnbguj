import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Role from '@/models/Role';
import Jurisdiction from '@/models/Jurisdiction';
import { auth } from '@/auth';
import { ROLE_SEED_MAP } from '@/lib/access';
import { ensureAccessSeeded } from '@/lib/accessServer';

// GET /api/me — server-side truth for the logged-in user's access identity.
// The client JWT can predate access-schema updates (roles/modules added
// later) and next-auth never refreshes those fields on its own, so the
// sidebar/profile resolve identity here instead of forcing every user to
// re-login. Identifies the user by the stable token `sub`, not by token fields.
export async function GET() {
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid || !/^[0-9a-fA-F]{24}$/.test(uid)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await dbConnect();
    await ensureAccessSeeded();
    const user = await User.findById(uid).lean() as unknown as {
      name?: string;
      username?: string;
      roles?: string[];
      role?: string;
      officeType?: string;
      jurisdiction?: string;
      assignedSubDivisions?: string[];
    } | null;
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    let roleKeys = Array.isArray(user.roles) ? user.roles.map((k) => String(k).toUpperCase()).filter(Boolean) : [];
    if (roleKeys.length === 0 && user.role) {
      roleKeys = [String(user.role).toUpperCase()];
      await User.findByIdAndUpdate(uid, { $set: { roles: roleKeys }, $unset: { role: '' } }).catch(() => null);
    }
    const roleDocs = await Role.find({ key: { $in: roleKeys } }).lean() as unknown as { key: string; label?: string; modules?: string[] }[];
    const roleByKey = new Map(roleDocs.map((r) => [r.key, r]));
    const moduleSet = new Set<string>();
    roleKeys.forEach((k) => {
      const mods = roleByKey.get(k)?.modules ?? ROLE_SEED_MAP[k]?.modules ?? [];
      (mods as string[]).forEach((m) => moduleSet.add(m));
    });
    const primaryKey = roleKeys[0] || '';
    const primaryDoc = roleByKey.get(primaryKey);
    let jurisdictionName = '';
    if (user.jurisdiction && /^[0-9a-fA-F]{24}$/.test(String(user.jurisdiction))) {
      const jDoc = await Jurisdiction.findById(user.jurisdiction).select('name').lean() as unknown as { name?: string } | null;
      jurisdictionName = jDoc?.name || '';
    }
    return NextResponse.json({
      role: primaryKey,
      roles: roleKeys,
      roleLabel: primaryDoc?.label || ROLE_SEED_MAP[primaryKey]?.label || primaryKey,
      roleLabels: roleKeys.map((k) => roleByKey.get(k)?.label || ROLE_SEED_MAP[k]?.label || k),
      officeType: user.officeType || 'DIVISION',
      jurisdiction: user.jurisdiction || '',
      jurisdictionName,
      modules: Array.from(moduleSet),
      username: user.username,
      name: user.name,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to resolve identity' }, { status: 500 });
  }
}
