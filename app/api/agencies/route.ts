import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Agency from '@/models/Agency';

export async function GET() {
    try {
        await dbConnect();
        const agencies = await Agency.find({}).sort({ name: 1 });
        return NextResponse.json({ success: true, data: agencies });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const agency = await Agency.create(body);
        return NextResponse.json({ success: true, data: agency }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
