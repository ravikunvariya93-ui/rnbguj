import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';

// Ensure models are registered for populate
void WorkOrder;
void LOA;
void Tender;

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const skip = (page - 1) * limit;

        const total = await Bill.countDocuments({});
        const bills = await Bill.find({})
            .populate({
                path: 'workOrderId',
                populate: {
                    path: 'loaId',
                    populate: { path: 'tenderId' }
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
            
        return NextResponse.json({ 
            success: true, 
            data: bills,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
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
