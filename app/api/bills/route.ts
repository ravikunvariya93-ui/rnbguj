import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';

export async function GET() {
    try {
        await dbConnect();
        const bills = await Bill.find({})
            .populate({
                path: 'workOrderId',
                populate: {
                    path: 'loaId',
                    populate: { path: 'tenderId' }
                }
            })
            .sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: bills });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as any).message }, { status: 400 });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const bill = await Bill.create(body);
        return NextResponse.json({ success: true, data: bill }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as any).message }, { status: 400 });
    }
}
