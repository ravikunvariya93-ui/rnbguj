import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import dbConnect from '@/lib/db';
import User from '@/models/User';

export async function GET() {
  try {
    await dbConnect();

    // Check if any admin exists
    const adminExists = await User.findOne({ role: 'ADMIN' });
    if (adminExists) {
      return NextResponse.json({ message: 'Admin user already exists' }, { status: 400 });
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
      credentials: 'Username: admin, Password: admin123'
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
