import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Package from '@/models/Package';

// Ensure models are registered for populate
void LOA;
void Tender;
void Package;

export async function GET() {
    await dbConnect();
    try {
        const workOrders = await WorkOrder.find({})
            .populate({
                path: 'loaId',
                populate: { 
                    path: 'tenderId',
                    populate: { path: 'packageId' }
                }
            });
        return NextResponse.json({ success: true, data: workOrders });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
