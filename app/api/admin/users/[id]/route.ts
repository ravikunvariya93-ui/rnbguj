import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Role from '@/models/Role';
import { auth } from '@/auth';
import Jurisdiction from '@/models/Jurisdiction';
import { OFFICE_TYPES, SCOPED_ROLE_KEYS } from '@/lib/access';
import { ensureAccessSeeded, findAuditorScopeConflict, isAdminSession } from '@/lib/accessServer';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!(await isAdminSession(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }
  try {
    const { name, username, password, roles, officeType, jurisdiction, assignedSubDivision, assignedSubDivisions } = await req.json();
    await dbConnect();
    await ensureAccessSeeded();
    let roleKeys: string[] | undefined;
    if (roles !== undefined) {
      roleKeys = (Array.isArray(roles) ? roles : [roles]).map((r) => String(r).toUpperCase()).filter(Boolean);
      if (roleKeys.length === 0) {
        return NextResponse.json({ error: 'Select at least one role' }, { status: 400 });
      }
      const foundRoles = await Role.find({ key: { $in: roleKeys } }).select('key').lean() as unknown as { key: string }[];
      if (foundRoles.length !== roleKeys.length) {
        return NextResponse.json({ error: 'One or more roles are invalid' }, { status: 400 });
      }
    }
    await dbConnect();

    // Check if another user already has the new username
    if (username) {
      const existingUser = await User.findOne({ username, _id: { $ne: id } });
      if (existingUser) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 400 });
      }
    }

    // Fetch current state to detect changes for nameHistory
    const currentUser = await User.findById(id);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    let postingType: string | undefined;
    let jurisdictionId: string | undefined;
    let assignedSubDivisionIds: string[] | undefined;
    if (officeType !== undefined || jurisdiction !== undefined || roleKeys !== undefined || assignedSubDivision !== undefined || assignedSubDivisions !== undefined) {
      const currentOffice = officeType !== undefined ? officeType : currentUser.officeType;
      postingType = currentOffice === OFFICE_TYPES.SUB_DIVISION ? OFFICE_TYPES.SUB_DIVISION : OFFICE_TYPES.DIVISION;
      const currentRoles = Array.isArray((currentUser as unknown as { roles?: string[] }).roles)
        ? (currentUser as unknown as { roles?: string[] }).roles as string[]
        : [];
      const effectiveRoles = roleKeys !== undefined ? roleKeys : currentRoles;
      const rawRef = jurisdiction !== undefined ? String(jurisdiction || '').trim() : (currentUser.jurisdiction || '');
      if (!rawRef) {
        return NextResponse.json({ error: 'Select a Division / Sub Division posting' }, { status: 400 });
      }
      // Accept a doc id (new) or a legacy stored name.
      const jDoc = /^[0-9a-fA-F]{24}$/.test(rawRef)
        ? await Jurisdiction.findById(rawRef).lean() as unknown as { _id?: unknown; type?: string } | null
        : await Jurisdiction.findOne({ name: rawRef }).lean() as unknown as { _id?: unknown; type?: string } | null;
      if (!jDoc?._id) {
        return NextResponse.json({ error: 'Select a valid Division / Sub Division posting' }, { status: 400 });
      }
      if (postingType === OFFICE_TYPES.SUB_DIVISION && jDoc.type !== OFFICE_TYPES.SUB_DIVISION) {
        return NextResponse.json({ error: 'Sub Division office users must pick a Sub Division' }, { status: 400 });
      }
      if (postingType === OFFICE_TYPES.DIVISION && !effectiveRoles.some((k) => SCOPED_ROLE_KEYS.includes(k)) && jDoc.type !== OFFICE_TYPES.DIVISION) {
        return NextResponse.json({ error: 'Division office users must pick a Division' }, { status: 400 });
      }
      jurisdictionId = String(jDoc._id);
      // Scoped roles (Auditor) additionally pick the Sub Division(s) whose bills they pass.
      // Any Division-office user may also carry a multi sub-division charge
      // (e.g. DEE of Palitana + Mahuva) which scopes their data access.
      const incomingAssigned = assignedSubDivisions !== undefined ? assignedSubDivisions : assignedSubDivision;
      if (incomingAssigned !== undefined) {
        const rawList = Array.isArray(incomingAssigned) ? incomingAssigned : [incomingAssigned];
        const idList = [...new Set(rawList.map((v) => String(v || '').trim()).filter(Boolean))];
        const resolvedIds: string[] = [];
        for (const ref of idList) {
          const aDoc = /^[0-9a-fA-F]{24}$/.test(ref)
            ? await Jurisdiction.findById(ref).lean() as unknown as { _id?: unknown; type?: string } | null
            : await Jurisdiction.findOne({ name: ref }).lean() as unknown as { _id?: unknown; type?: string } | null;
          if (!aDoc?._id || aDoc.type !== OFFICE_TYPES.SUB_DIVISION) {
            return NextResponse.json({ error: 'Scoped Sub Divisions must be Sub Division(s)' }, { status: 400 });
          }
          resolvedIds.push(String(aDoc._id));
        }
        assignedSubDivisionIds = [...new Set(resolvedIds)];
        if (effectiveRoles.some((k) => SCOPED_ROLE_KEYS.includes(k))) {
          if (assignedSubDivisionIds.length === 0) {
            return NextResponse.json({ error: 'Select at least one Sub Division whose bills this user passes' }, { status: 400 });
          }
          const clash = await findAuditorScopeConflict(assignedSubDivisionIds, id);
          if (clash) {
            return NextResponse.json({ error: `Another Auditor (${clash.name || clash.username}) already covers this sub-division` }, { status: 400 });
          }
        } else if (assignedSubDivisionIds.length > 0 && postingType === OFFICE_TYPES.SUB_DIVISION && !assignedSubDivisionIds.includes(jurisdictionId)) {
          return NextResponse.json({ error: 'Primary Sub Division posting must be one of the selected Sub Divisions' }, { status: 400 });
        }
      } else if (effectiveRoles.some((k) => SCOPED_ROLE_KEYS.includes(k))) {
        const existingAssigned = ((currentUser as unknown as { assignedSubDivisions?: string[] }).assignedSubDivisions
          ?? ((currentUser as unknown as { assignedSubDivision?: string }).assignedSubDivision
            ? [(currentUser as unknown as { assignedSubDivision?: string }).assignedSubDivision as string] : []));
        if (!existingAssigned || existingAssigned.length === 0) {
          return NextResponse.json({ error: 'Select at least one Sub Division whose bills this user passes' }, { status: 400 });
        }
      }
    }

    const nameChanged = name && name !== currentUser.name;

    // If the name changed, archive the old value into nameHistory
    let historyPush = null;
    if (nameChanged) {
      historyPush = {
        name: currentUser.name,
        changedAt: new Date(),
        changedBy: (session?.user as { username?: string } | undefined)?.username || 'admin',
      };
    }

    const updateData: { roles?: string[]; officeType?: string; jurisdiction?: string; assignedSubDivisions?: string[]; name?: string; username?: string; password?: string } = {};
    if (roleKeys !== undefined) updateData.roles = roleKeys;
    if (postingType !== undefined) updateData.officeType = postingType;
    if (jurisdictionId !== undefined) updateData.jurisdiction = jurisdictionId;
    if (assignedSubDivisionIds !== undefined) updateData.assignedSubDivisions = assignedSubDivisionIds;
    if (name) updateData.name = name;
    if (username) updateData.username = username;
    if (password) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Push to history if there was a change
    if (historyPush) {
      await User.findByIdAndUpdate(id, {
        $push: { nameHistory: historyPush },
      });
    }

    const user = await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).select('-password');
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!(await isAdminSession(session))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  
  // Prevent deleting self
  if (id === (session?.user as { id?: string } | undefined)?.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  try {
    await dbConnect();
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'User deleted successfully' });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}


