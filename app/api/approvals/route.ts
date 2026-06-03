import dbConnect from '@/lib/db';
import Approval from '@/models/Approval';
import Tender from '@/models/Tender';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    await dbConnect();
    try {
        const body = await req.json();
        const approval = await Approval.create(body);
        return NextResponse.json({ success: true, data: approval }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: 'Failed to create Approval' }, { status: 400 });
    }
}

export async function GET(request: Request) {
    await dbConnect();
    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const skip = (page - 1) * limit;

        const total = await Approval.countDocuments({});
        const approvals = await Approval.find({}).populate('tenderId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
        
        return NextResponse.json({ 
            success: true, 
            data: approvals,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch Approvals' }, { status: 500 });
    }
}
