import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { auth } from '@/auth';

export async function GET() {
  // Bootstrap endpoint: disabled in production unless explicitly allowed.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  try {
    await dbConnect();

    // Check if any admin exists
    const adminExists = await User.findOne({ role: 'ADMIN' });
    if (adminExists) {
      return NextResponse.json({ message: 'Admin user already exists' }, { status: 400 });
    }

    // Require auth if there are any users at all (prevents public takeover after first user)
    const anyUser = await User.findOne({}).select('_id').lean();
    if (anyUser) {
      const session = await auth();
      if ((session?.user as { role?: string } | undefined)?.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Create default admin
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const admin = await User.create({
      name: 'Super Admin',
      username: 'admin',
      password: hashedPassword,
      role: 'ADMIN',
    });

    return NextResponse.json({
      message: 'Admin user created successfully',
      user: {
        username: admin.username,
        role: admin.role,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Failed to create admin user' }, { status: 500 });
  }
}
