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

export async function GET() {
    await dbConnect();
    try {
        const approvals = await Approval.find({}).populate('tenderId').sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: approvals });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch Approvals' }, { status: 500 });
    }
}
