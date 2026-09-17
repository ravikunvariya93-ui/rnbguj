import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import { auth } from '@/auth';
import { isAuditorRole, getAuditorSubDivision } from '@/lib/roles';
import { auditorCanAccessBill } from '@/lib/services/billAccess';
import { isObjectId, sanitizeUpdate } from '@/lib/api/validation';

async function requireSession() {
    const session = await auth();
    if (!session?.user) return null;
    return session;
}

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const session = await requireSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const userRole = (session?.user as any)?.role;
        const auditorSubDivision = getAuditorSubDivision(userRole);

        const { id } = await params;
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return NextResponse.json({ success: false, error: 'Invalid bill id' }, { status: 400 });
        }

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
        return NextResponse.json({ success: false, error: 'Failed to fetch bill' }, { status: 400 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const session = await requireSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const role = (session?.user as any)?.role;
        // Tender Clerks cannot modify bills
        if (role === 'TENDERCLERK') {
            return NextResponse.json({ success: false, error: 'Tender Clerks do not have permission to modify bills' }, { status: 403 });
        }

        const { id } = await params;
        if (!isObjectId(id)) {
            return NextResponse.json({ success: false, error: 'Invalid bill id' }, { status: 400 });
        }
        const auditorSubDivision = getAuditorSubDivision(role);
        if (isAuditorRole(role) && auditorSubDivision) {
            const allowed = await auditorCanAccessBill(id, auditorSubDivision);
            if (!allowed) {
                return NextResponse.json({ success: false, error: 'Cannot modify bill for another sub-division' }, { status: 403 });
            }
        }

        const body = await request.json();
        const clean = sanitizeUpdate(body, ['workOrderId']);
        const bill = await Bill.findByIdAndUpdate(id, clean, {
            new: true,
            runValidators: true,
        });
        if (!bill) {
            return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: bill });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to update bill' }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const session = await requireSession();
        if (!session) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const role = (session?.user as any)?.role;
        // Tender Clerks cannot delete bills
        if (role === 'TENDERCLERK') {
            return NextResponse.json({ success: false, error: 'Tender Clerks do not have permission to delete bills' }, { status: 403 });
        }

        const { id } = await params;
        if (!/^[0-9a-fA-F]{24}$/.test(id)) {
            return NextResponse.json({ success: false, error: 'Invalid bill id' }, { status: 400 });
        }
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
        return NextResponse.json({ success: false, error: 'Failed to delete bill' }, { status: 400 });
    }
}
