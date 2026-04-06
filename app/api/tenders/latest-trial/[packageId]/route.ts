import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';
import { Types } from 'mongoose';

export async function GET(
    request: Request,
    { params }: { params: { packageId: string } }
) {
    try {
        await dbConnect();
        const { packageId } = params;

        const latestTender = await Tender.findOne({ packageId: packageId as any })
            .sort({ trialNo: -1 })
            .select('trialNo')
            .lean();

        return NextResponse.json({ 
            success: true, 
            latestTrialNo: latestTender ? latestTender.trialNo : 0 
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
