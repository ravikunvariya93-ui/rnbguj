import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import TechnicalSanction from '@/models/TechnicalSanction';
import ApprovedWork from '@/models/ApprovedWork';
import DTP from '@/models/DTP';
import Tender from '@/models/Tender';
import Approval from '@/models/Approval';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';
import Bill from '@/models/Bill';
import BOQ from '@/models/BOQ';
import ExcessProposal from '@/models/ExcessProposal';
import DepositRefund from '@/models/DepositRefund';
import { notFound } from 'next/navigation';
import PackageDetailClient from './PackageDetailClient';
import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import { auth } from '@/auth';
import { isAuditorRole, getAuditorSubDivision } from '@/lib/roles';

export const dynamic = 'force-dynamic';

function serialize<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    const sanitized = JSON.parse(
        JSON.stringify(obj, (_key, value) => {
            if (value && typeof value === 'object') {
                if (value._bsontype || (value.constructor && (value.constructor.name === 'ObjectId' || value.constructor.name === 'ObjectID'))) {
                    return value.toString();
                }
                if (value.type === 'Buffer' || value.buffer) {
                    return typeof value.toString === 'function' ? value.toString() : String(value);
                }
            }
            return value;
        })
    );

    const clean = (val: any): any => {
        if (!val || typeof val !== 'object') return val;
        if (Array.isArray(val)) return val.map(clean);
        const res: any = {};
        for (const k of Object.keys(val)) {
            const v = val[k];
            if (v && typeof v === 'object' && v.buffer && typeof v.buffer === 'object') {
                res[k] = String(v);
            } else {
                res[k] = clean(v);
            }
        }
        return res;
    };

    return clean(sanitized);
}

export default async function PackageDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const auditorSubDivision = getAuditorSubDivision(userRole);
    const isAuditor = isAuditorRole(userRole);

    const { id } = await params;

    const pkg = await Package.findById(id).populate('works.workId').lean() as any;
    if (!pkg) notFound();

    // Auditor access check: verify package belongs to auditor's sub-division
    if (isAuditor && auditorSubDivision) {
        const worksInAuditorSubDiv = await ApprovedWork.find({ subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') } }).select('workName').lean();
        const workNames = new Set(worksInAuditorSubDiv.map((aw: any) => (aw.workName || '').toLowerCase().trim()));
        const pkgSubDiv = (pkg.subDivision || '').toLowerCase().trim();
        const hasMatchingWork = (pkg.works || []).some((w: any) => workNames.has((w.workName || '').toLowerCase().trim()));
        const isAllowed = pkgSubDiv === auditorSubDivision.toLowerCase().trim() || hasMatchingWork;

        if (!isAllowed) {
            return (
                <div className="max-w-xl mx-auto mt-24 text-center px-4">
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-10">
                        <ShieldAlert className="w-12 h-12 text-red-400 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-red-700 mb-2">Access Denied</h2>
                        <p className="text-sm text-red-600 mb-6">
                            You are assigned to <strong>{auditorSubDivision}</strong> sub-division only.
                            This package belongs to <strong>{pkg.subDivision || 'a different sub-division'}</strong>.
                        </p>
                        <Link href="/packages" className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors">
                            <ArrowLeft className="w-4 h-4" /> Back to Packages
                        </Link>
                    </div>
                </div>
            );
        }
    }

    // Fetch all ApprovedWorks to match details by name on client side
    const approvedWorks = await ApprovedWork.find({}).lean() as any[];

    // DTP — linked to Package._id
    const dtp = await DTP.findOne({ tsId: pkg._id }).lean() as any;

    // Fetch all tenders for the package (all trials/attempts) sorted by trialNo descending
    const tenders = await Tender.find({ packageId: pkg._id }).sort({ trialNo: -1 }).lean() as any[];

    // Tender — linked to Package._id (latest non-cancelled)
    const tender = tenders.find(t => !t.cancelled) || null;

    // Approval + LOA + BOQ
    const [approval, loa, boq] = tender
        ? await Promise.all([
            Approval.findOne({ tenderId: tender._id }).lean() as any,
            LOA.findOne({ tenderId: tender._id }).lean() as any,
            BOQ.findOne({ tenderId: tender._id }).lean() as any,
        ])
        : [null, null, null];

    // WorkOrder
    const workOrder = loa ? await WorkOrder.findOne({ loaId: loa._id }).lean() as any : null;

    // Bills
    const bills = workOrder
        ? await Bill.find({ workOrderId: workOrder._id })
            .sort({ billDate: 1, runningBillNumber: 1 }).lean() as any[]
        : [];

    // Excess Proposals
    const excessProposals = await ExcessProposal.find({ packageId: pkg._id })
        .sort({ proposalDate: -1, createdAt: -1 })
        .lean() as any[];

    // Deposit Refunds
    const depositRefunds = await DepositRefund.find({ packageId: pkg._id })
        .sort({ orderDate: -1, createdAt: -1 })
        .lean() as any[];

    // Fetch all work orders to determine the maximum agreement number per year
    const allWorkOrders = await WorkOrder.find({ notRequired: { $ne: true } }, 'agreementYear agreementNo').lean() as any[];
    const maxAgreementNos: Record<string, number> = {};
    for (const wo of allWorkOrders) {
        if (wo.agreementYear && wo.agreementNo) {
            const num = parseInt(wo.agreementNo, 10);
            if (!isNaN(num)) {
                maxAgreementNos[wo.agreementYear] = Math.max(maxAgreementNos[wo.agreementYear] || 0, num);
            }
        }
    }

    return (
        <PackageDetailClient
            packageId={id}
            pkg={serialize(pkg)}
            approvedWorks={serialize(approvedWorks)}
            dtp={dtp ? serialize(dtp) : null}
            tender={tender ? serialize(tender) : null}
            tenders={serialize(tenders)}
            boq={boq ? serialize(boq) : null}
            approval={approval ? serialize(approval) : null}
            loa={loa ? serialize(loa) : null}
            workOrder={workOrder ? serialize(workOrder) : null}
            bills={serialize(bills)}
            excessProposals={serialize(excessProposals)}
            depositRefunds={serialize(depositRefunds)}
            maxAgreementNos={maxAgreementNos}
        />
    );
}
