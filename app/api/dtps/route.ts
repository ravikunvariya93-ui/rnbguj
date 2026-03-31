import dbConnect from '@/lib/db';
import DTP from '@/models/DTP';
import TechnicalSanction from '@/models/TechnicalSanction';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    await dbConnect();
    try {
        const body = await req.json();
        const dtp = await DTP.create(body);
        return NextResponse.json({ success: true, data: dtp }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: 'Failed to create DTP' }, { status: 400 });
    }
}

export async function GET() {
    await dbConnect();
    try {
        const dtps = await DTP.find({}).populate('tsId').sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: dtps });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch DTPs' }, { status: 500 });
    }
}
