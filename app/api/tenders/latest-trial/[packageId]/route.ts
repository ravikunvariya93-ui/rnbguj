import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Tender from '@/models/Tender';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ packageId: string }> }
) {
    try {
        await dbConnect();
        const { packageId } = await params;

        const latestTender = await Tender.findOne({ packageId: packageId } as unknown as Parameters<typeof Tender.findOne>[0])
            .sort({ trialNo: -1 })
            .select('trialNo')
            .lean();

        return NextResponse.json({ 
            success: true, 
            latestTrialNo: latestTender ? latestTender.trialNo : 0 
        });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
