import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import WorkOrder from '@/models/WorkOrder';
import Package from '@/models/Package';
import { auth } from '@/auth';
import { isAuditorRole, getAuditorSubDivision } from '@/lib/roles';
import { getAuditorWorkOrderIds } from '@/lib/services/billAccess';
import { getPagination, isObjectId, sanitizeUpdate } from '@/lib/api/validation';

// Ensure models are registered for populate
void WorkOrder;
void Package;

export async function GET(request: Request) {
    try {
        await dbConnect();
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const userRole = (session?.user as { role?: string } | undefined)?.role;
        const auditorSubDivision = getAuditorSubDivision(userRole);
        const isAuditor = isAuditorRole(userRole);

        const { searchParams } = new URL(request.url);
        const { page, limit, skip } = getPagination(request.url);
        const workOrderId = searchParams.get('workOrderId');
        if (workOrderId && !isObjectId(workOrderId)) {
            return NextResponse.json({ success: false, error: 'Invalid workOrderId' }, { status: 400 });
        }

        const query: { workOrderId?: string | { $in: string[] } } = {};
        if (workOrderId) {
            query.workOrderId = workOrderId;
        }

        // Enforce auditor subDivision restriction via shared service
        if (isAuditor && auditorSubDivision) {
            const workOrderIds = await getAuditorWorkOrderIds(auditorSubDivision);

            // Intersect with provided workOrderId if any
            if (workOrderId) {
                if (!workOrderIds.includes(workOrderId)) {
                    return NextResponse.json({ success: true, data: [], pagination: { total: 0, page, limit, totalPages: 0 } });
                }
            } else {
                query.workOrderId = { $in: workOrderIds };
            }
        }

        const total = await Bill.countDocuments(query as unknown as Parameters<typeof Bill.countDocuments>[0]);
        const bills = await Bill.find(query as unknown as Parameters<typeof Bill.find>[0])
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
            pagination: { total, page, limit, totalPages: limit > 0 ? Math.ceil(total / limit) : 0 }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch bills' }, { status: 400 });
    }
}

export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const role = (session.user as { role?: string } | undefined)?.role;
        // Tender Clerks cannot create bills
        if (role === 'TENDERCLERK') {
            return NextResponse.json({ success: false, error: 'Tender Clerks do not have permission to create bills' }, { status: 403 });
        }

        await dbConnect();
        const body = await request.json();
        if (!body.workOrderId || !isObjectId(String(body.workOrderId))) {
            return NextResponse.json({ success: false, error: 'Valid workOrderId is required' }, { status: 400 });
        }
        if (!body.billType || !['Running', 'Final'].includes(body.billType)) {
            return NextResponse.json({ success: false, error: 'Valid billType is required' }, { status: 400 });
        }
        const clean = sanitizeUpdate(body);

        // If Auditor, ensure the target workOrder belongs to their sub-division
        const auditorSubDivision = getAuditorSubDivision(role);
        if (isAuditorRole(role) && auditorSubDivision) {
            const workOrder = await WorkOrder.findById(clean.workOrderId).populate({
                path: 'loaId',
                populate: { path: 'tenderId' }
            }).lean() as unknown as {
                loaId?: { tenderId?: { packageId?: unknown } };
            } | null;
            const packageId = workOrder?.loaId?.tenderId?.packageId;
            if (packageId) {
                const pkg = await Package.findById(packageId).select('subDivision').lean() as unknown as {
                    subDivision?: string;
                } | null;
                const pkgSubDiv: string = pkg?.subDivision || '';
                if (pkgSubDiv.toLowerCase() !== auditorSubDivision.toLowerCase()) {
                    return NextResponse.json({ success: false, error: 'Cannot create bill for another sub-division' }, { status: 403 });
                }
            }
        }

        const bill = await Bill.create(clean);
        return NextResponse.json({ success: true, data: bill }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to create bill' }, { status: 400 });
    }
}
