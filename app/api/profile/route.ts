import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { auth } from '@/auth';

/** GET /api/profile — fetch own full profile including nameHistory */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const userId = (session.user as any).id;
    const user = await User.findById(userId).select('-password').lean();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    return NextResponse.json(user);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

/** PUT /api/profile — update own name and/or designation */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, designation } = await req.json();
    await dbConnect();

    const userId = (session.user as any).id;
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const nameChanged = name && name !== currentUser.name;
    const designationChanged = designation !== undefined && designation !== currentUser.designation;

    // Archive old values into history
    if (nameChanged || designationChanged) {
      await User.findByIdAndUpdate(userId, {
        $push: {
          nameHistory: {
            name: currentUser.name,
            designation: currentUser.designation || '',
            changedAt: new Date(),
            changedBy: (session.user as any).username || 'self',
          },
        },
      });
    }

    const updateData: any = {};
    if (name) updateData.name = name;
    if (designation !== undefined) updateData.designation = designation;

    const updated = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
