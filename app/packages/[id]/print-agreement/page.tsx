import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import Tender from '@/models/Tender';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Agency from '@/models/Agency';
import DTP from '@/models/DTP';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import AgreementClient from './AgreementClient';

export const dynamic = 'force-dynamic';

interface Props {
    params: Promise<{ id: string }>;
}

export default async function PrintAgreementPage({ params }: Props) {
    await dbConnect();
    const { id } = await params;

    // Fetch Package details
    const pkgRaw = await Package.findById(id).lean() as any;
    if (!pkgRaw) notFound();

    // Fetch related Tender
    const tenderRaw = await Tender.findOne({ packageId: pkgRaw._id, cancelled: { $ne: true } })
        .sort({ trialNo: -1 }).lean() as any;

    if (!tenderRaw) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-3 max-w-md">
                    <h1 className="text-lg font-bold text-slate-800">Tender Details Pending</h1>
                    <p className="text-sm text-slate-500">
                        There is no active tender associated with this package. Please complete the Tender details before printing the Agreement.
                    </p>
                    <Link href={`/packages/${id}`} className="inline-block px-4 py-2 bg-[#107c41] hover:bg-[#0f5b30] text-white text-xs font-bold rounded-lg transition-colors">
                        Back to Package details
                    </Link>
                </div>
            </div>
        );
    }

    // Fetch related LOA
    const loaRaw = await LOA.findOne({ tenderId: tenderRaw._id }).lean() as any;

    if (!loaRaw) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-3 max-w-md">
                    <h1 className="text-lg font-bold text-slate-800">LOA Details Pending</h1>
                    <p className="text-sm text-slate-500">
                        LOA details have not been created for this package yet. Please complete the Letter of Acceptance (LOA) section before printing the Agreement.
                    </p>
                    <Link href={`/packages/${id}`} className="inline-block px-4 py-2 bg-[#107c41] hover:bg-[#0f5b30] text-white text-xs font-bold rounded-lg transition-colors">
                        Back to Package details
                    </Link>
                </div>
            </div>
        );
    }

    // Fetch WorkOrder
    const workOrderRaw = await WorkOrder.findOne({ loaId: loaRaw._id }).lean() as any;

    if (!workOrderRaw) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8 space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-3 max-w-md">
                    <h1 className="text-lg font-bold text-slate-800">Work Order Details Pending</h1>
                    <p className="text-sm text-slate-500">
                        Work Order details have not been created for this package yet. Please complete the Work Order section before printing the Agreement.
                    </p>
                    <Link href={`/packages/${id}`} className="inline-block px-4 py-2 bg-[#107c41] hover:bg-[#0f5b30] text-white text-xs font-bold rounded-lg transition-colors">
                        Back to Package details
                    </Link>
                </div>
            </div>
        );
    }

    // Fetch Agency (Contractor) details for address
    const agencyRaw = await Agency.findOne({ name: tenderRaw.contractorName }).lean() as any;

    // Fetch DTP details for tenderAmount (if needed)
    const dtpRaw = await DTP.findOne({ tsId: pkgRaw._id }).lean() as any;

    // Serialize data
    const packageData = JSON.parse(JSON.stringify(pkgRaw));
    const tender = JSON.parse(JSON.stringify(tenderRaw));
    const loa = JSON.parse(JSON.stringify(loaRaw));
    const workOrder = JSON.parse(JSON.stringify(workOrderRaw));
    const agency = agencyRaw ? JSON.parse(JSON.stringify(agencyRaw)) : null;
    const dtp = dtpRaw ? JSON.parse(JSON.stringify(dtpRaw)) : null;

    return (
        <AgreementClient
            packageData={packageData}
            tender={tender}
            loa={loa}
            workOrder={workOrder}
            agency={agency}
            dtp={dtp}
        />
    );
}
