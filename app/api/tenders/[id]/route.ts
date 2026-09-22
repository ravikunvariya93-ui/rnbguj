import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';
import LOA from '@/models/LOA';
import Approval from '@/models/Approval';
import WorkOrder from '@/models/WorkOrder';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const tender = await Tender.findById(id);

        if (!tender) {
            return NextResponse.json({ success: false, error: 'Tender not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: tender });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        delete body._id; // Prevent updating _id

        const tender = await Tender.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });

        if (!tender) {
            return NextResponse.json({ success: false, error: 'Tender not found' }, { status: 404 });
        }

        // Auto-mark/unmark Tender Approval based on updated tender amount
        const tenderAmt = tender.estimatedAmount !== undefined && tender.estimatedAmount !== null 
            ? Number(tender.estimatedAmount) 
            : Number(tender.contractPrice || 0);
        if (tenderAmt > 0) {
            if (tenderAmt < 5000000) {
                await Approval.findOneAndUpdate(
                    { tenderId: tender._id } as unknown as Parameters<typeof Approval.findOneAndUpdate>[0],
                    { $set: { notRequired: true } },
                    { upsert: true, new: true }
                );
            } else {
                await Approval.findOneAndUpdate(
                    { tenderId: tender._id } as unknown as Parameters<typeof Approval.findOneAndUpdate>[0],
                    { $set: { notRequired: false } }
                );
            }
        }

        return NextResponse.json({ success: true, data: tender });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;

        // CASCADING DELETES
        
        // 1. Find and delete LOA(s) and their associated WorkOrders
        const loas = await LOA.find({ tenderId: id });
        for (const loa of loas) {
            await WorkOrder.deleteMany({ loaId: loa._id });
            await LOA.findByIdAndDelete(loa._id);
        }

        // 2. Delete associated Approvals
        await Approval.deleteMany({ tenderId: id } as unknown as Parameters<typeof Approval.deleteMany>[0]);

        // 3. Delete the Tender itself
        const deletedTender = await Tender.findByIdAndDelete(id);

        if (!deletedTender) {
            return NextResponse.json({ success: false, error: 'Tender not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: {} });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
    }
}
