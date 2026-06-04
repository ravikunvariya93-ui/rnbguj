import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BOQ from '@/models/BOQ';
import Tender from '@/models/Tender';

// Ensure Tender model is registered for populate
void Tender;

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
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const skip = (page - 1) * limit;

        const total = await BOQ.countDocuments({});
        const boqs = await BOQ.find({}).populate({
            path: 'tenderId',
            select: 'tenderId packageName packageId'
        }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
        
        return NextResponse.json({ 
            success: true, 
            data: boqs,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
