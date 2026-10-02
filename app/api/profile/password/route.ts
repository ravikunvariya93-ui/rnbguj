import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { auth } from '@/auth';

/** POST /api/profile/password — change own password (current password required). */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const { currentPassword, newPassword } = await req.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
    }
    if (String(newPassword).length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }
    await dbConnect();
    const userId = (session.user as { id?: string }).id;
    const user = await User.findById(userId);
    if (!user || !user.password) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const ok = await bcrypt.compare(String(currentPassword), user.password as string);
    if (!ok) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 403 });
    }
    user.password = await bcrypt.hash(String(newPassword), 10);
    await user.save();
    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch {
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
  }
}
