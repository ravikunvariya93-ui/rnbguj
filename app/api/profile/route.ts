import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import Jurisdiction from '@/models/Jurisdiction';
import { auth } from '@/auth';

/** GET /api/profile — fetch own full profile including nameHistory */
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await dbConnect();
    const userId = (session.user as { id?: string }).id;
    const user = await User.findById(userId).select('-password').lean() as unknown as Record<string, unknown> | null;
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    // Resolve posting name for display (stored as doc id).
    let jurisdictionName = '';
    if (typeof user.jurisdiction === 'string' && /^[0-9a-fA-F]{24}$/.test(user.jurisdiction)) {
      const jDoc = await Jurisdiction.findById(user.jurisdiction).select('name').lean() as unknown as { name?: string } | null;
      jurisdictionName = jDoc?.name || '';
    } else if (typeof user.jurisdiction === 'string') {
      jurisdictionName = user.jurisdiction;
    }
    return NextResponse.json({ ...user, jurisdictionName });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

/** PUT /api/profile — update own name */
export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name } = await req.json();
    await dbConnect();

    const userId = (session.user as { id?: string }).id;
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const nameChanged = name && name !== currentUser.name;

    // Archive old name into history
    if (nameChanged) {
      await User.findByIdAndUpdate(userId, {
        $push: {
          nameHistory: {
            name: currentUser.name,
            changedAt: new Date(),
            changedBy: (session.user as { username?: string }).username || 'self',
          },
        },
      });
    }

    const updateData: { name?: string } = {};
    if (name) updateData.name = name;

    const updated = await User.findByIdAndUpdate(userId, updateData, { new: true }).select('-password');
    return NextResponse.json(updated);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
