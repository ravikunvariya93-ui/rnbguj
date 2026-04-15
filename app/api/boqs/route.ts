import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BOQ from '@/models/BOQ';

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const boq = await BOQ.create(body);
        return NextResponse.json({ success: true, data: boq }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function GET(request: Request) {
    try {
        await dbConnect();
        const boqs = await BOQ.find({}).populate({
            path: 'tenderId',
            select: 'tenderId packageName'
        }).sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: boqs });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
