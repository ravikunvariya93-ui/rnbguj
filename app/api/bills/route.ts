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

export async function GET(request: Request) {
    try {
        await dbConnect();
        const session = await auth();
        const userRole = (session?.user as any)?.role;
        const auditorSubDivision = getAuditorSubDivision(userRole);
        const isAuditor = isAuditorRole(userRole);

        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const workOrderId = searchParams.get('workOrderId');
        const skip = (page - 1) * limit;

        const query: any = {};
        if (workOrderId) {
            query.workOrderId = workOrderId;
        }

        // Enforce auditor subDivision restriction via Package.subDivision chain
        if (isAuditor && auditorSubDivision) {
            const packageIds = (await Package.find({
                subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') }
            }).distinct('_id')) as any[];
            const tenderIds = (await Tender.find({ packageId: { $in: packageIds } }).distinct('_id')) as any[];
            const loaIds = (await LOA.find({ tenderId: { $in: tenderIds } }).distinct('_id')) as any[];
            const workOrderIds = (await WorkOrder.find({ loaId: { $in: loaIds } }).distinct('_id')) as any[];

            // Intersect with provided workOrderId if any
            if (workOrderId) {
                const allowed = workOrderIds.map((id: any) => id.toString());
                if (!allowed.includes(workOrderId)) {
                    return NextResponse.json({ success: true, data: [], pagination: { total: 0, page, limit, totalPages: 0 } });
                }
            } else {
                query.workOrderId = { $in: workOrderIds };
            }
        }

        const total = await Bill.countDocuments(query);
        const bills = await Bill.find(query)
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
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const role = (session.user as any)?.role;
        // Tender Clerks cannot create bills
        if (role === 'TENDERCLERK') {
            return NextResponse.json({ success: false, error: 'Tender Clerks do not have permission to create bills' }, { status: 403 });
        }

        await dbConnect();
        const body = await request.json();

        // If Auditor, ensure the target workOrder belongs to their sub-division
        const auditorSubDivision = getAuditorSubDivision(role);
        if (isAuditorRole(role) && auditorSubDivision) {
            const workOrder = await WorkOrder.findById(body.workOrderId).populate({
                path: 'loaId',
                populate: { path: 'tenderId' }
            }).lean() as any;
            const packageId = workOrder?.loaId?.tenderId?.packageId;
            if (packageId) {
                const pkg = await Package.findById(packageId).select('subDivision').lean() as any;
                const pkgSubDiv: string = pkg?.subDivision || '';
                if (pkgSubDiv.toLowerCase() !== auditorSubDivision.toLowerCase()) {
                    return NextResponse.json({ success: false, error: 'Cannot create bill for another sub-division' }, { status: 403 });
                }
            }
        }

        const bill = await Bill.create(body);
        return NextResponse.json({ success: true, data: bill }, { status: 201 });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as any).message }, { status: 400 });
    }
}
