import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Role from '@/models/Role';
import { auth } from '@/auth';
import Jurisdiction from '@/models/Jurisdiction';
import { OFFICE_TYPES, SCOPED_ROLE_KEYS } from '@/lib/access';
import { ensureAccessSeeded, findAuditorScopeConflict, isAdminSession } from '@/lib/accessServer';

export async function GET() {
  const session = await auth();
  if (!(await isAdminSession(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const users = await User.find({}).select('-password').sort({ createdAt: -1 });
    return NextResponse.json(users);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!(await isAdminSession(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, username, password, roles, officeType, jurisdiction, assignedSubDivision, assignedSubDivisions } = await req.json();

    if (!name || !username || !password || !roles) {
      return NextResponse.json({ error: 'Name, username, password and at least one role are required' }, { status: 400 });
    }

    await dbConnect();
    await ensureAccessSeeded();
    const roleKeys = (Array.isArray(roles) ? roles : [roles]).map((r) => String(r).toUpperCase()).filter(Boolean);
    if (roleKeys.length === 0) {
      return NextResponse.json({ error: 'Select at least one role' }, { status: 400 });
    }
    const foundRoles = await Role.find({ key: { $in: roleKeys } }).select('key').lean() as unknown as { key: string }[];
    if (foundRoles.length !== roleKeys.length) {
      return NextResponse.json({ error: 'One or more roles are invalid' }, { status: 400 });
    }
    const postingType = officeType === OFFICE_TYPES.SUB_DIVISION ? OFFICE_TYPES.SUB_DIVISION : OFFICE_TYPES.DIVISION;
    const needsSubDivision = postingType === OFFICE_TYPES.SUB_DIVISION || roleKeys.some((k) => SCOPED_ROLE_KEYS.includes(k));
    const jurisdictionId = String(jurisdiction || '').trim();
    if (!jurisdictionId) {
      return NextResponse.json({ error: 'Select a Division / Sub Division posting' }, { status: 400 });
    }
    const jDoc = await Jurisdiction.findById(jurisdictionId).lean() as unknown as { type?: string } | null;
    if (!jDoc) {
      return NextResponse.json({ error: 'Select a valid Division / Sub Division posting' }, { status: 400 });
    }
    if (postingType === OFFICE_TYPES.SUB_DIVISION && jDoc.type !== OFFICE_TYPES.SUB_DIVISION) {
      return NextResponse.json({ error: 'Sub Division office users must pick a Sub Division' }, { status: 400 });
    }
    if (postingType === OFFICE_TYPES.DIVISION && !roleKeys.some((k) => SCOPED_ROLE_KEYS.includes(k)) && jDoc.type !== OFFICE_TYPES.DIVISION) {
      return NextResponse.json({ error: 'Division office users must pick a Division' }, { status: 400 });
    }
    // Scoped roles (Auditor) additionally pick the Sub Division(s) whose bills they pass.
    // Any Division-office user may also carry a multi sub-division charge
    // (e.g. DEE of Palitana + Mahuva) which scopes their data access.
    let assignedSubDivisionIds: string[] = [];
    const rawList = Array.isArray(assignedSubDivisions) ? assignedSubDivisions : (Array.isArray(assignedSubDivision) ? assignedSubDivision : (assignedSubDivision ? [assignedSubDivision] : []));
    if (rawList.length > 0) {
      assignedSubDivisionIds = [...new Set(rawList.map((v) => String(v || '').trim()).filter((v) => /^[0-9a-fA-F]{24}$/.test(v)))];
      const aDocs = await Jurisdiction.find({ _id: { $in: assignedSubDivisionIds } }).select('type').lean() as unknown as { type?: string }[];
      if (aDocs.length !== assignedSubDivisionIds.length || aDocs.some((d) => d.type !== OFFICE_TYPES.SUB_DIVISION)) {
        return NextResponse.json({ error: 'Scoped Sub Divisions must be Sub Division(s)' }, { status: 400 });
      }
    }
    if (roleKeys.some((k) => SCOPED_ROLE_KEYS.includes(k))) {
      if (assignedSubDivisionIds.length === 0) {
        return NextResponse.json({ error: 'Select at least one Sub Division whose bills this user passes' }, { status: 400 });
      }
      const clash = await findAuditorScopeConflict(assignedSubDivisionIds);
      if (clash) {
        return NextResponse.json({ error: `Another Auditor (${clash.name || clash.username}) already covers this sub-division` }, { status: 400 });
      }
    } else if (assignedSubDivisionIds.length > 0) {
      // Multi-charge for non-auditors (e.g. DEE of Palitana + Mahuva).
      // Division-office users scope to the selected Sub Divisions;
      // Sub Division-office users record all held Sub Division postings.
      if (postingType === OFFICE_TYPES.SUB_DIVISION && !assignedSubDivisionIds.includes(jurisdictionId)) {
        return NextResponse.json({ error: 'Primary Sub Division posting must be one of the selected Sub Divisions' }, { status: 400 });
      }
    }
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      username,
      password: hashedPassword,
      roles: roleKeys,
      officeType: postingType,
      jurisdiction: jurisdictionId,
      assignedSubDivisions: assignedSubDivisionIds,
      nameHistory: [],
    });

    const { password: _, ...userWithoutPassword } = user.toObject();
    return NextResponse.json(userWithoutPassword, { status: 201 });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}


