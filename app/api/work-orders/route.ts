import dbConnect from '@/lib/db';
import WorkOrder from '@/models/WorkOrder';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
    await dbConnect();
    try {
        const body = await req.json();
        const workOrder = await WorkOrder.create(body);
        return NextResponse.json({ success: true, data: workOrder }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: 'Failed to create Work Order' }, { status: 400 });
    }
}

export async function GET() {
    await dbConnect();
    try {
        const workOrders = await WorkOrder.find({}).populate('loaId').sort({ createdAt: -1 });
        return NextResponse.json({ success: true, data: workOrders });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch Work Orders' }, { status: 500 });
    }
}
