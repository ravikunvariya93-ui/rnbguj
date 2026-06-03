import dbConnect from '@/lib/db';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import { NextResponse } from 'next/server';

// Ensure Tender model is registered for populate
void Tender;

export async function POST(req: Request) {
    await dbConnect();
    try {
        const body = await req.json();
        const loa = await LOA.create(body);
        return NextResponse.json({ success: true, data: loa }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: 'Failed to create LOA' }, { status: 400 });
    }
}

export async function GET(request: Request) {
    await dbConnect();
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const skip = (page - 1) * limit;

        const total = await LOA.countDocuments({});
        const loas = await LOA.find({}).populate('tenderId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
        
        return NextResponse.json({ 
            success: true, 
            data: loas,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch LOAs' }, { status: 500 });
    }
}
