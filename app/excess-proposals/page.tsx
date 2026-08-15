import dbConnect from '@/lib/db';
import ExcessProposal from '@/models/ExcessProposal';
import Package from '@/models/Package';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import ExcessProposalsClient from './ExcessProposalsClient';

// Register models for populate
void Package;
void WorkOrder;
void LOA;
void Tender;

export const dynamic = 'force-dynamic';

function serialize<T>(obj: T): T {
    if (obj === null || obj === undefined) return obj;
    return JSON.parse(
        JSON.stringify(obj, (_key, value) => {
            if (value && typeof value === 'object') {
                if (value._bsontype || (value.constructor && (value.constructor.name === 'ObjectId' || value.constructor.name === 'ObjectID'))) {
                    return value.toString();
                }
                if (value.type === 'Buffer' || (value.buffer && (value.buffer instanceof ArrayBuffer || ArrayBuffer.isView(value.buffer)))) {
                    return typeof value.toString === 'function' ? value.toString() : String(value);
                }
            }
            return value;
        })
    );
}

export default async function ExcessProposalsPage() {
    await dbConnect();

    const [rawProposals, rawPackages] = await Promise.all([
        ExcessProposal.find({})
            .populate('packageId', 'packageName subDivision dtpConsultant')
            .populate('workOrderId', 'agreementNo agreementYear agencyName')
            .sort({ proposalDate: -1, createdAt: -1 })
            .lean(),
        Package.find({}, 'packageName subDivision').sort({ packageName: 1 }).lean(),
    ]);

    // Resolve contractor name from each package's winning (non-cancelled) tender
    const packageIds = [...new Set(
        rawProposals
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

    const enrichedProposals = rawProposals.map((p: any) => {
        const pkgId = p.packageId?._id || p.packageId;
        return {
            ...p,
            contractorName: pkgId ? (contractorMap.get(String(pkgId)) || '') : '',
        };
    });

    const proposals = serialize(enrichedProposals);
    const packages = serialize(rawPackages);

    return (
        <ExcessProposalsClient 
            initialProposals={proposals}
            packages={packages}
        />
    );
}
