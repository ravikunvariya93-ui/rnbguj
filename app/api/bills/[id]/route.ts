import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Package from '@/models/Package';
import { auth } from '@/auth';
import { isAuditorRole, getAuditorSubDivision } from '@/lib/roles';

// Ensure models are registered for populate
void WorkOrder;
void LOA;
void Tender;
void Package;

/** Helper: verify an auditor is allowed to access a given bill via Package.subDivision */
async function auditorCanAccessBill(billId: string, auditorSubDivision: string): Promise<boolean> {
    const bill = await Bill.findById(billId)
        .populate({
            path: 'workOrderId',
            populate: { path: 'loaId', populate: { path: 'tenderId' } }
        })
        .lean() as any;
    if (!bill) return false;

    const packageId = bill?.workOrderId?.loaId?.tenderId?.packageId;
    if (!packageId) return false;

    const pkg = await Package.findById(packageId).select('subDivision').lean() as any;
    const subDiv: string = pkg?.subDivision || '';
    return subDiv.toLowerCase() === auditorSubDivision.toLowerCase();
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const session = await auth();
        const userRole = (session?.user as any)?.role;
        const auditorSubDivision = getAuditorSubDivision(userRole);

        const { id } = await params;

        // Auditor access check
        if (isAuditorRole(userRole) && auditorSubDivision) {
            const allowed = await auditorCanAccessBill(id, auditorSubDivision);
            if (!allowed) {
                return NextResponse.json({ success: false, error: 'Access denied' }, { status: 403 });
            }
        }

        const bill = await Bill.findById(id).populate({
            path: 'workOrderId',
            populate: {
                path: 'loaId',
                populate: { path: 'tenderId' }
            }
        });
        if (!bill) {
            return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: bill });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as any).message }, { status: 400 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const session = await auth();
        const role = (session?.user as any)?.role;
        // Tender Clerks cannot modify bills
        if (role === 'TENDERCLERK') {
            return NextResponse.json({ success: false, error: 'Tender Clerks do not have permission to modify bills' }, { status: 403 });
        }

        const { id } = await params;
        const auditorSubDivision = getAuditorSubDivision(role);
        if (isAuditorRole(role) && auditorSubDivision) {
            const allowed = await auditorCanAccessBill(id, auditorSubDivision);
            if (!allowed) {
                return NextResponse.json({ success: false, error: 'Cannot modify bill for another sub-division' }, { status: 403 });
            }
        }

        const body = await request.json();
        const bill = await Bill.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });
        if (!bill) {
            return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: bill });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as any).message }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const session = await auth();
        const role = (session?.user as any)?.role;
        // Tender Clerks cannot delete bills
        if (role === 'TENDERCLERK') {
            return NextResponse.json({ success: false, error: 'Tender Clerks do not have permission to delete bills' }, { status: 403 });
        }

        const { id } = await params;
        const auditorSubDivision = getAuditorSubDivision(role);
        if (isAuditorRole(role) && auditorSubDivision) {
            const allowed = await auditorCanAccessBill(id, auditorSubDivision);
            if (!allowed) {
                return NextResponse.json({ success: false, error: 'Cannot delete bill for another sub-division' }, { status: 403 });
            }
        }

        const bill = await Bill.findByIdAndDelete(id);
        if (!bill) {
            return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: bill });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as any).message }, { status: 400 });
    }
}
