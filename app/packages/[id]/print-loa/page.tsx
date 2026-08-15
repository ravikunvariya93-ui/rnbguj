import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import Tender from '@/models/Tender';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Agency from '@/models/Agency';
import Approval from '@/models/Approval';
import DTP from '@/models/DTP';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import LOALetterClient from './LOALetterClient';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function PrintLOAPage({ params }: Props) {
    await dbConnect();
    const { id } = await params;

    // Fetch Package details
    const pkgRaw = await Package.findById(id).lean() as any;
    if (!pkgRaw) notFound();

    // Fetch related Tender (latest non-cancelled)
    const tenderRaw = await Tender.findOne({ packageId: pkgRaw._id, cancelled: { $ne: true } })
        .sort({ trialNo: -1 }).lean() as any;

    if (!tenderRaw) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-3 max-w-md">
                    <h1 className="text-lg font-bold text-slate-800">Tender Details Pending</h1>
                    <p className="text-sm text-slate-500">
                        There is no active tender associated with this package. Please complete the Tender details before printing the Letter of Acceptance (LOA).
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
        LOA.findOne({ tenderId: tenderRaw._id }).lean() as any,
        Approval.findOne({ tenderId: tenderRaw._id }).lean() as any
    ]);

    if (!approvalRaw) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-md space-y-4">
                    <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-xl font-bold">
                        !
                    </div>
                    <h1 className="text-lg font-bold text-slate-800">Tender Approval Details Missing</h1>
                    <p className="text-sm text-slate-500">
                        Tender Approval details have not been created for this package yet. Please enter Tender Approval before printing LOA.
                    </p>
                    <Link href={`/packages/${id}`} className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">
                        ← Back to Package
                    </Link>
                </div>
            </div>
        );
    }

    if (!loaRaw || !loaRaw.acceptanceLetterWorksheetNo || !loaRaw.acceptanceLetterDate) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-3 max-w-md">
                    <h1 className="text-lg font-bold text-slate-800">LOA Details Pending</h1>
                    <p className="text-sm text-slate-500">
                        LOA details have not been created or are incomplete for this package yet. Please complete the Letter of Acceptance (LOA) section before printing.
                    </p>
                    <Link href={`/packages/${id}`} className="inline-block px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors">
                        Back to Package details
                    </Link>
                </div>
            </div>
        );
    }

    // Fetch WorkOrder (if exists)
    const workOrderRaw = await WorkOrder.findOne({ loaId: loaRaw._id }).lean() as any;

    // Fetch Agency (Contractor) details for address and mobile number
    const agencyRaw = await Agency.findOne({ name: tenderRaw.contractorName }).lean() as any;

    // Fetch DTP details for tenderAmount
    const dtpRaw = await DTP.findOne({ tsId: pkgRaw._id }).lean() as any;

    // Serialize data to avoid passing Mongoose rich objects to Client
    const packageData = JSON.parse(JSON.stringify(pkgRaw));
    const tender = JSON.parse(JSON.stringify(tenderRaw));
    const loa = JSON.parse(JSON.stringify(loaRaw));
    const workOrder = workOrderRaw ? JSON.parse(JSON.stringify(workOrderRaw)) : null;
    const agency = agencyRaw ? JSON.parse(JSON.stringify(agencyRaw)) : null;
    const approval = approvalRaw ? JSON.parse(JSON.stringify(approvalRaw)) : null;
    const dtp = dtpRaw ? JSON.parse(JSON.stringify(dtpRaw)) : null;

    if (approval) {
        tender.tenderApprovalOffice ||= approval.tenderApprovalOffice;
        tender.tenderApprovalNo ||= approval.tenderApprovalNo;
        tender.tenderApprovalDate ||= approval.tenderApprovalDate;
    }

    return (
        <LOALetterClient
            packageData={packageData}
            tender={tender}
            loa={loa}
            workOrder={workOrder}
            agency={agency}
            approval={approval}
            dtp={dtp}
        />
    );
}
