import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import Tender from '@/models/Tender';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Agency from '@/models/Agency';
import ApprovedWork from '@/models/ApprovedWork';
import Approval from '@/models/Approval';
import DTP from '@/models/DTP';
import type { QueryFilter } from 'mongoose';
import type { ITender } from '@/models/Tender';
import type { IApproval } from '@/models/Approval';
import type { IWorkOrder } from '@/models/WorkOrder';
import type { IDTP } from '@/models/DTP';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import WorkOrderLetterClient from './WorkOrderLetterClient';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
}

interface PackageLean {
    _id: string;
    works?: { workName: string }[];
    budgetHead?: string;
}

interface TenderLean {
    _id: string;
    contractorId?: string;
    contractorName?: string;
}

interface IdLean {
    _id: string;
}

interface ApprovedWorkLean {
    budgetHead?: string;
}

export default async function PrintWorkOrderPage({ params }: Props) {
    await dbConnect();
    const { id } = await params;

    // Fetch Package details
    const pkgRaw = await Package.findById(id).lean() as unknown as PackageLean | null;
    if (!pkgRaw) notFound();

    // Fetch related Tender
    const tenderRaw = await Tender.findOne({ packageId: pkgRaw._id, cancelled: { $ne: true } } as unknown as QueryFilter<ITender>)
        .sort({ trialNo: -1 }).lean() as unknown as TenderLean | null;

    if (!tenderRaw) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-3 max-w-md">
                    <h1 className="text-lg font-bold text-slate-800">Tender Details Pending</h1>
                    <p className="text-sm text-slate-500">
                        There is no active tender associated with this package. Please complete the Tender details before printing the Work Order.
                    </p>
                    <Link href={`/packages/${id}`} className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">
                        ← Back to Package
                    </Link>
                </div>
            </div>
        );
    }

    // Fetch related LOA and Approval
    const [loaRaw, approvalRaw] = await Promise.all([
        LOA.findOne({ tenderId: tenderRaw._id }).lean() as unknown as Promise<IdLean | null>,
        Approval.findOne({ tenderId: tenderRaw._id } as unknown as QueryFilter<IApproval>).lean() as unknown as Promise<IdLean | null>
    ]);

    const workOrderRaw = loaRaw ? await WorkOrder.findOne({ loaId: loaRaw._id } as unknown as QueryFilter<IWorkOrder>).lean() as unknown as IdLean & { workOrderWorksheetNo?: string; workOrderNo?: string; workOrderDate?: string } | null : null;

    if (!workOrderRaw || (!workOrderRaw.workOrderWorksheetNo && !workOrderRaw.workOrderNo) || !workOrderRaw.workOrderDate) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 space-y-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md space-y-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
                        !
                    </div>
                    <h1 className="text-lg font-bold text-slate-800">Work Order Details Missing</h1>
                    <p className="text-sm text-slate-500">
                        Work Order details have not been created or are incomplete for this package yet. Please complete the Work Order section before printing.
                    </p>
                    <Link href={`/packages/${id}`} className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">
                        ← Back to Package
                    </Link>
                </div>
            </div>
        );
    }

    // Fetch Agency (Contractor) details for address and mobile number
    const agencyRaw = tenderRaw.contractorId
        ? await Agency.findById(tenderRaw.contractorId).lean() as unknown as IdLean | null
        : await Agency.findOne({ name: tenderRaw.contractorName }).lean() as unknown as IdLean | null;

    // Fetch DTP details for tenderAmount
    const dtpRaw = await DTP.findOne({ tsId: pkgRaw._id } as unknown as QueryFilter<IDTP>).lean() as unknown as IdLean | null;

    // Fetch linked ApprovedWorks to find budget heads
    const workNames = pkgRaw.works ? pkgRaw.works.map((w: { workName: string }) => w.workName) : [];
    const matchedApprovedWorks = await ApprovedWork.find({ workName: { $in: workNames } }).lean() as unknown as ApprovedWorkLean[];
    const budgetHeads = Array.from(new Set([pkgRaw.budgetHead, ...matchedApprovedWorks.map((aw: ApprovedWorkLean) => aw.budgetHead)].filter((b): b is string => Boolean(b))));

    // Serialize data to avoid any passing of rich objects (e.g. Mongoose Document, ObjectIds, Dates) to the Client Component
    const packageData = JSON.parse(JSON.stringify(pkgRaw));
    const tender = JSON.parse(JSON.stringify(tenderRaw));
    const loa = loaRaw ? JSON.parse(JSON.stringify(loaRaw)) : null;
    const workOrder = JSON.parse(JSON.stringify(workOrderRaw));
    const agency = agencyRaw ? JSON.parse(JSON.stringify(agencyRaw)) : null;
    const approval = approvalRaw ? JSON.parse(JSON.stringify(approvalRaw)) : null;
    const dtp = dtpRaw ? JSON.parse(JSON.stringify(dtpRaw)) : null;

    if (approval) {
        tender.tenderApprovalOffice ||= approval.tenderApprovalOffice;
        tender.tenderApprovalNo ||= approval.tenderApprovalNo;
        tender.tenderApprovalDate ||= approval.tenderApprovalDate;
    }

    return (
        <WorkOrderLetterClient
            packageData={packageData}
            tender={tender}
            loa={loa}
            workOrder={workOrder}
            agency={agency}
            budgetHeads={budgetHeads}
            approval={approval}
            dtp={dtp}
        />
    );
}
