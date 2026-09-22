import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import TechnicalSanction from '@/models/TechnicalSanction';

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const sanction = await TechnicalSanction.create(body);

        return NextResponse.json({ success: true, data: sanction }, { status: 201 });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
    }
}

export async function GET() {
    try {
        await dbConnect();
        const sanctions = await TechnicalSanction.find({}).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: sanctions });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
