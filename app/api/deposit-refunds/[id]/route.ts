import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import DepositRefund from '@/models/DepositRefund';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const refund = await DepositRefund.findById(id).populate('packageId').lean();
        if (!refund) {
            return NextResponse.json({ success: false, error: 'Deposit refund not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: refund });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Failed to fetch deposit refund' }, { status: 500 });
    }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await req.json();

        const updateData: any = { ...body };
        if (updateData.orderDate) updateData.orderDate = new Date(updateData.orderDate);
        if (updateData.applicationDate) updateData.applicationDate = new Date(updateData.applicationDate);
        if (updateData.actualCompletionDate) updateData.actualCompletionDate = new Date(updateData.actualCompletionDate);
        if (updateData.fdrDate) updateData.fdrDate = new Date(updateData.fdrDate);
        if (updateData.amount !== undefined) updateData.amount = Number(updateData.amount);

        const updated = await DepositRefund.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!updated) {
            return NextResponse.json({ success: false, error: 'Deposit refund not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Failed to update deposit refund' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const deleted = await DepositRefund.findByIdAndDelete(id);
        if (!deleted) {
            return NextResponse.json({ success: false, error: 'Deposit refund not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: deleted });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message || 'Failed to delete deposit refund' }, { status: 500 });
    }
}
