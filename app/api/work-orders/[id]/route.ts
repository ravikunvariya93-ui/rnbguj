import dbConnect from '@/lib/db';
import WorkOrder from '@/models/WorkOrder';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    try {
        const workOrder = await WorkOrder.findById(id).populate('loaId');
        if (!workOrder) {
            return NextResponse.json({ success: false, error: 'Work Order not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: workOrder });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch Work Order' }, { status: 400 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    try {
        const body = await req.json();
        const workOrder = await WorkOrder.findByIdAndUpdate(id, body, { new: true, runValidators: true });
        if (!workOrder) {
            return NextResponse.json({ success: false, error: 'Work Order not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: workOrder });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to update Work Order' }, { status: 400 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    try {
        const deletedWorkOrder = await WorkOrder.findByIdAndDelete(id);
        if (!deletedWorkOrder) {
            return NextResponse.json({ success: false, error: 'Work Order not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to delete Work Order' }, { status: 400 });
    }
}
