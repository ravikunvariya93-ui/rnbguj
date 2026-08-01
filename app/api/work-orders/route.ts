import dbConnect from '@/lib/db';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Package from '@/models/Package';
import { NextResponse } from 'next/server';
import { checkAndSendWorkOrderSMS } from '@/lib/sms';

// Ensure models are registered for populate
void LOA;
void Tender;
void Package;

export async function POST(req: Request) {
    await dbConnect();
    try {
        const body = await req.json();
        if (body.notRequired) {
            body.agreementNo = '';
            body.agreementYear = '';
            body.agreementDate = null;
        }
        const workOrder = await WorkOrder.create(body);
        
        // Trigger SMS and await to ensure it completes in Serverless environments (like Vercel)
        if (workOrder && workOrder._id) {
            try {
                await checkAndSendWorkOrderSMS(workOrder._id.toString());
            } catch (err) {
                console.error('[SMS POST Trigger Error]', err);
            }
        }

        return NextResponse.json({ success: true, data: workOrder }, { status: 201 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ success: false, error: 'Failed to create Work Order' }, { status: 400 });
    }
}

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
    await dbConnect();
    try {
        const { searchParams } = new URL(req.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const skip = (page - 1) * limit;

        const total = await WorkOrder.countDocuments({});
        const workOrders = await WorkOrder.find({})
            .populate({
                path: 'loaId',
                populate: { 
                    path: 'tenderId',
                    populate: { path: 'packageId' }
                }
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
            
        return NextResponse.json({ 
            success: true, 
            data: workOrders,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch Work Orders' }, { status: 500 });
    }
}
