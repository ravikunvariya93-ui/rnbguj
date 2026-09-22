import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import DepositRefund from '@/models/DepositRefund';
import Package from '@/models/Package';
import WorkOrder from '@/models/WorkOrder';

void Package;
void WorkOrder;

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const packageId = searchParams.get('packageId');
        const refundType = searchParams.get('refundType');

        const query: { packageId?: string; refundType?: string } = {};
        if (packageId) query.packageId = packageId;
        if (refundType) query.refundType = refundType;

        const refunds = await DepositRefund.find(query as unknown as Parameters<typeof DepositRefund.find>[0])
            .populate('packageId', 'packageName subDivision')
            .sort({ orderDate: -1, createdAt: -1 })
            .lean();

        return NextResponse.json({ success: true, data: refunds });
    } catch (error: unknown) {
        console.error('Failed to fetch deposit refunds:', error);
        return NextResponse.json({ success: false, error: error instanceof Error && error.message ? error.message : 'Failed to fetch deposit refunds' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();

        if (!body.packageId) {
            return NextResponse.json({ success: false, error: 'Package ID is required' }, { status: 400 });
        }

        const refundData: {
            packageId: string;
            workOrderId?: string;
            refundType: string;
            orderNo?: string;
            orderDate?: Date;
            applicationRef?: string;
            applicationDate?: Date;
            actualCompletionDate?: Date;
            bankName?: string;
            fdrNumber?: string;
            fdrDate?: Date;
            amount?: number;
            status: string;
            remarks?: string;
        } = {
            packageId: body.packageId,
            workOrderId: body.workOrderId || undefined,
            refundType: body.refundType || 'Additional SD',
            orderNo: body.orderNo || undefined,
            orderDate: body.orderDate ? new Date(body.orderDate) : undefined,
            applicationRef: body.applicationRef || undefined,
            applicationDate: body.applicationDate ? new Date(body.applicationDate) : undefined,
            actualCompletionDate: body.actualCompletionDate ? new Date(body.actualCompletionDate) : undefined,
            bankName: body.bankName || undefined,
            fdrNumber: body.fdrNumber || undefined,
            fdrDate: body.fdrDate ? new Date(body.fdrDate) : undefined,
            amount: body.amount !== undefined && body.amount !== null && body.amount !== '' ? Number(body.amount) : undefined,
            status: body.status || 'Pending',
            remarks: body.remarks || undefined,
        };

        // If a record with packageId and refundType already exists and no id provided, we can either update or create
        let refund;
        if (body._id) {
            refund = await DepositRefund.findByIdAndUpdate(body._id, refundData, { new: true, runValidators: true });
        } else {
            // Check if one already exists for this package + refundType
            const existing = await DepositRefund.findOne({ packageId: body.packageId, refundType: refundData.refundType });
            if (existing) {
                refund = await DepositRefund.findByIdAndUpdate(existing._id, refundData, { new: true, runValidators: true });
            } else {
                refund = await DepositRefund.create(refundData as unknown as Parameters<typeof DepositRefund.create>[0]);
            }
        }

        return NextResponse.json({ success: true, data: refund }, { status: 201 });
    } catch (error: unknown) {
        console.error('Failed to save deposit refund:', error);
        return NextResponse.json({ success: false, error: error instanceof Error && error.message ? error.message : 'Failed to save deposit refund' }, { status: 500 });
    }
}
