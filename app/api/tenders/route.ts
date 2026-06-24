import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import '@/models/Package';
import '@/models/TechnicalSanction';
import Tender from '@/models/Tender';
import Approval from '@/models/Approval';

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();

        // Basic validation
        if (!body.packageId) {
            return NextResponse.json({ success: false, error: 'Package ID is required' }, { status: 400 });
        }

        const tender = await Tender.create(body);

        // Auto-mark Tender Approval as Not Required if tender amount is less than 5,000,000
        const tenderAmt = tender.estimatedAmount !== undefined && tender.estimatedAmount !== null 
            ? Number(tender.estimatedAmount) 
            : Number(tender.contractPrice || 0);
        if (tenderAmt > 0 && tenderAmt < 5000000) {
            await Approval.findOneAndUpdate(
                { tenderId: tender._id } as any,
                { $set: { notRequired: true } },
                { upsert: true, new: true }
            );
        }

        return NextResponse.json({ success: true, data: tender }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function GET(request: Request) {
    try {
        await dbConnect();
        
        const { searchParams } = new URL(request.url);
        const includeId = searchParams.get('includeId');
        const pageStr = searchParams.get('page');
        const limitStr = searchParams.get('limit');
        
        const page = pageStr ? parseInt(pageStr, 10) : 1;
        const limit = limitStr ? parseInt(limitStr, 10) : 100;
        const skip = (page - 1) * limit;

        const total = await Tender.countDocuments({});

        const tenders = await Tender.find({})
            .select('tenderId packageName packageId trialNo contractorName tenderNoticeYear noticeNo srNo cancelled cancellationReason aboveBelowPercentage aboveBelowInWord contractPrice')
            .populate({ path: 'packageId', select: 'packageName works' })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        // Group by packageId and keep the one with the highest trialNo
        const packageMap = new Map<string, any>();
        for (const tender of tenders) {
            const pkg = tender.packageId as any;
            const pkgId = pkg?._id?.toString() || pkg?.toString();
            if (!pkgId) {
                // If there's no packageId, keep it as is
                packageMap.set(`no-pkg-${tender._id}`, tender);
                continue;
            }
            const existing = packageMap.get(pkgId);
            if (!existing) {
                packageMap.set(pkgId, tender);
            } else {
                const existingTrial = existing.trialNo || 1;
                const currentTrial = tender.trialNo || 1;
                if (currentTrial > existingTrial) {
                    packageMap.set(pkgId, tender);
                }
            }
        }

        const filteredTenders = Array.from(packageMap.values());

        // If includeId is specified and not present in the filtered list, append it
        if (includeId) {
            const isAlreadyIncluded = filteredTenders.some(t => t._id.toString() === includeId);
            if (!isAlreadyIncluded) {
                const extraTender = await Tender.findById(includeId).populate('packageId');
                if (extraTender) {
                    filteredTenders.push(extraTender);
                }
            }
        }

        return NextResponse.json({ 
            success: true, 
            data: filteredTenders,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
