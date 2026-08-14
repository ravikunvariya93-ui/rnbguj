import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ExcessProposal from '@/models/ExcessProposal';
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

        const query: any = {};
        if (packageId) {
            query.packageId = packageId;
        }

        const proposals = await ExcessProposal.find(query)
            .populate('packageId', 'packageName subDivision dtpConsultant')
            .populate('workOrderId', 'agreementNo agreementYear agencyName')
            .sort({ proposalDate: -1, createdAt: -1 })
            .lean();

        // Resolve contractor name from each package's winning (non-cancelled) tender
        const packageIds = [...new Set(
            proposals
                .map((p: any) => p.packageId?._id || p.packageId)
                .filter(Boolean)
        )];

        const contractorMap = new Map<string, string>();
        if (packageIds.length > 0) {
            const tenders = await Tender.find({
                packageId: { $in: packageIds },
                cancelled: { $ne: true },
                contractorName: { $exists: true, $ne: '' },
            })
                .sort({ trialNo: -1 })
                .select('packageId contractorName')
                .lean();

            for (const t of tenders as any[]) {
                const key = String(t.packageId);
                if (!contractorMap.has(key)) {
                    contractorMap.set(key, t.contractorName || '');
                }
            }
        }

        const enriched = proposals.map((p: any) => {
            const pkgId = p.packageId?._id || p.packageId;
            return {
                ...p,
                contractorName: pkgId ? (contractorMap.get(String(pkgId)) || '') : '',
            };
        });

        return NextResponse.json({ success: true, data: enriched });
    } catch (error: any) {
        console.error('Failed to fetch excess proposals:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch excess proposals' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await dbConnect();
        const body = await req.json();

        if (!body.packageId) {
            return NextResponse.json({ error: 'Package ID is required' }, { status: 400 });
        }

        const proposal = await ExcessProposal.create({
            packageId: body.packageId,
            workOrderId: body.workOrderId || undefined,
            proposalNo: body.proposalNo ? body.proposalNo.trim() : undefined,
            proposalDate: body.proposalDate ? new Date(body.proposalDate) : new Date(),
            pdfUrl: body.pdfUrl || undefined,
            fileName: body.fileName || undefined,
            fileSize: body.fileSize || undefined,
            remarks: body.remarks || undefined,
            status: body.status || 'Submitted',
            excessAmount: body.excessAmount ? Number(body.excessAmount) : undefined,
            savingAmount: body.savingAmount ? Number(body.savingAmount) : undefined,
            approvalNo: body.approvalNo || undefined,
            approvalDate: body.approvalDate ? new Date(body.approvalDate) : undefined,
            approvalAuthority: body.approvalAuthority || undefined,
        });

        const populated = await ExcessProposal.findById(proposal._id)
            .populate('packageId', 'packageName subDivision dtpConsultant')
            .lean();

        return NextResponse.json({ success: true, data: populated }, { status: 201 });
    } catch (error: any) {
        console.error('Failed to create excess proposal:', error);
        return NextResponse.json({ error: error.message || 'Failed to create excess proposal' }, { status: 500 });
    }
}
