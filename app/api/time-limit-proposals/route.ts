import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import TimeLimitProposal from '@/models/TimeLimitProposal';
import Package from '@/models/Package';
import WorkOrder from '@/models/WorkOrder';
import Tender from '@/models/Tender';

// Ensure models are registered
void Package;
void WorkOrder;
void Tender;

export async function GET(req: NextRequest) {
    try {
        await dbConnect();
        const { searchParams } = new URL(req.url);
        const packageId = searchParams.get('packageId');

        const query: { packageId?: string } = {};
        if (packageId) {
            query.packageId = packageId;
        }

        const proposals = await TimeLimitProposal.find(query)
            .populate('packageId', 'packageName subDivision dtpConsultant')
            .populate('workOrderId', 'agreementNo agreementYear agencyName')
            .sort({ proposalDate: -1, createdAt: -1 })
            .lean();

        // Resolve contractor name from each package's winning (non-cancelled) tender
        const packageIds = [...new Set(
            proposals
                .map((p) => {
                    const pkg = p.packageId as unknown as { _id?: unknown } | string | null;
                    return (typeof pkg === 'object' && pkg !== null ? pkg._id : pkg) || undefined;
                })
                .filter(Boolean)
        )];

        const contractorMap = new Map<string, string>();
        if (packageIds.length > 0) {
            const tenders = await Tender.find({
                packageId: { $in: packageIds },
                cancelled: { $ne: true },
                contractorName: { $exists: true, $ne: '' },
            } as unknown as Parameters<typeof Tender.find>[0])
                .sort({ trialNo: -1 })
                .select('packageId contractorName')
                .lean();

            for (const t of tenders as { packageId?: unknown; contractorName?: string }[]) {
                const key = String(t.packageId);
                if (!contractorMap.has(key)) {
                    contractorMap.set(key, t.contractorName || '');
                }
            }
        }

        const enriched = proposals.map((p) => {
            const pkg = p.packageId as unknown as { _id?: unknown } | string | null;
            const pkgId: unknown = typeof pkg === 'object' && pkg !== null ? pkg._id : pkg;
            return {
                ...p,
                contractorName: pkgId ? (contractorMap.get(String(pkgId)) || '') : '',
            };
        });

        return NextResponse.json({ success: true, data: enriched });
    } catch (error: unknown) {
        console.error('Failed to fetch time limit proposals:', error);
        return NextResponse.json({ error: error instanceof Error && error.message ? error.message : 'Failed to fetch time limit proposals' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();

        if (!body.packageId) {
            return NextResponse.json({ error: 'Package ID is required' }, { status: 400 });
        }

        const proposal = await TimeLimitProposal.create({
            packageId: body.packageId,
            workOrderId: body.workOrderId || undefined,
            proposalNo: body.proposalNo ? body.proposalNo.trim() : undefined,
            proposalDate: body.proposalDate ? new Date(body.proposalDate) : new Date(),
            pdfUrl: body.pdfUrl || undefined,
            fileName: body.fileName || undefined,
            fileSize: body.fileSize || undefined,
            remarks: body.remarks || undefined,
            status: body.status || 'Submitted',
            approvalNo: body.approvalNo || undefined,
            approvalDate: body.approvalDate ? new Date(body.approvalDate) : undefined,
            approvalAuthority: body.approvalAuthority || undefined,
        });

        const populated = await TimeLimitProposal.findById(proposal._id)
            .populate('packageId', 'packageName subDivision dtpConsultant')
            .lean();

        return NextResponse.json({ success: true, data: populated }, { status: 201 });
    } catch (error: unknown) {
        console.error('Failed to create time limit proposal:', error);
        return NextResponse.json({ error: error instanceof Error && error.message ? error.message : 'Failed to create time limit proposal' }, { status: 500 });
    }
}
