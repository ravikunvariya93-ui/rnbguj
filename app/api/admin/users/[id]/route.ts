import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { auth } from '@/auth';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  if (!/^[0-9a-fA-F]{24}$/.test(id)) {
    return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
  }
  try {
    const { name, username, password, role, designation } = await req.json();
    const VALID_ROLES = ['ADMIN', 'SUPERVISOR', 'VIEWER', 'TENDERCLERK', 'AUDITOR_BVN', 'AUDITOR_TLJ', 'AUDITOR_MHV', 'AUDITOR_SHR', 'AUDITOR_VLB', 'AUDITOR_PLT'];
    if (role !== undefined && !VALID_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
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

    const nameChanged = name && name !== currentUser.name;
    const designationChanged = designation !== undefined && designation !== currentUser.designation;

    // If name or designation changed, archive the old values into nameHistory
    let historyPush = null;
    if (nameChanged || designationChanged) {
      historyPush = {
        name: currentUser.name,
        designation: currentUser.designation || '',
        changedAt: new Date(),
        changedBy: (session?.user as { username?: string } | undefined)?.username || 'admin',
      };
    }

    const updateData: { role?: string; name?: string; username?: string; designation?: string; password?: string } = {};
    if (role !== undefined) updateData.role = role;
    if (name) updateData.name = name;
    if (username) updateData.username = username;
    if (designation !== undefined) updateData.designation = designation;
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
  if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
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
