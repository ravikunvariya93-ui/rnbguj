import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import DTP from '@/models/DTP';
import Tender from '@/models/Tender';
import Approval from '@/models/Approval';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const pkg = await Package.findById(id);

        if (!pkg) {
            return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: pkg });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();

        delete body._id;

        const pkg = await Package.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });

        if (!pkg) {
            return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: pkg });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;

        // DEEP CASCADING DELETES
        
        // 1. DTP deletion
        await DTP.deleteMany({ tsId: id });

        // 2. Tenders & Sub-records deletion (Approval, LOA, WorkOrder)
        const tenders = await Tender.find({ packageId: id });
        for (const tender of tenders) {
            const loas = await LOA.find({ tenderId: tender._id });
            for (const loa of loas) {
                await WorkOrder.deleteMany({ loaId: loa._id });
                await LOA.findByIdAndDelete(loa._id);
            }
            await Approval.deleteMany({ tenderId: tender._id });
            await Tender.findByIdAndDelete(tender._id);
        }

        // 3. Delete Package itself
        const deletedPkg = await Package.findByIdAndDelete(id);

        if (!deletedPkg) {
            return NextResponse.json({ success: false, error: 'Package not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: {} });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
