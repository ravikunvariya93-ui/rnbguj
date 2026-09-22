import dbConnect from '@/lib/db';
import ExcessProposal from '@/models/ExcessProposal';
import Package from '@/models/Package';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import ApprovedWork from '@/models/ApprovedWork';
import ExcessProposalsClient, { type Proposal, type PackageOption } from './ExcessProposalsClient';
import { auth } from '@/auth';
import { isAuditorRole, getAuditorSubDivision } from '@/lib/roles';
import type { QueryFilter } from 'mongoose';
import type { IExcessProposal } from '@/models/ExcessProposal';
import type { IPackage } from '@/models/Package';
import type { ITender } from '@/models/Tender';

type ExcessProposalFilter = QueryFilter<IExcessProposal>;
type PackageFilter = QueryFilter<IPackage>;
type TenderFilter = QueryFilter<ITender>;

interface LeanProposalPackage {
    _id?: unknown;
    packageName?: string;
    subDivision?: string;
}

interface LeanProposal {
    _id?: unknown;
    packageId?: LeanProposalPackage | string | null;
    [key: string]: unknown;
}

function refId(ref: LeanProposal['packageId']): string {
    if (ref == null) return '';
    if (typeof ref === 'string') return ref;
    const id = ref._id;
    if (id == null) return String(ref);
    return String(id);
}

// Register models for populate
void Package;
void WorkOrder;
void LOA;
void Tender;
void ApprovedWork;

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
    const session = await auth();
    const userRole = (session?.user as { role?: string } | undefined)?.role;
    const auditorSubDivision = getAuditorSubDivision(userRole);
    const isAuditor = isAuditorRole(userRole);

    const proposalQuery: ExcessProposalFilter = {};
    let packageQuery: PackageFilter = {};

    if (isAuditor && auditorSubDivision) {
        const worksInAuditorSubDiv = await ApprovedWork.find({ subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') } }).select('workName').lean();
        const workNames = worksInAuditorSubDiv.map((aw) => aw.workName).filter(Boolean);
        const subDivPackageCondition = {
            $or: [
                { subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') } },
                { 'works.workName': { $in: workNames } }
            ]
        };
        const matchingPkgIds: string[] = (await Package.find(subDivPackageCondition as unknown as PackageFilter).distinct('_id')).map(String);
        proposalQuery.packageId = { $in: matchingPkgIds };
        packageQuery = subDivPackageCondition as unknown as PackageFilter;
    }

    const [rawProposalsResult, rawPackages] = await Promise.all([
        ExcessProposal.find(proposalQuery)
            .populate('packageId', 'packageName subDivision dtpConsultant')
            .populate('workOrderId', 'agreementNo agreementYear agencyName')
            .sort({ proposalDate: -1, createdAt: -1 })
            .lean(),
        Package.find(packageQuery, 'packageName subDivision').sort({ packageName: 1 }).lean(),
    ]);
    const rawProposals = rawProposalsResult as unknown as LeanProposal[];

    // Resolve contractor name from each package's winning (non-cancelled) tender
    const packageIds = [...new Set(
        rawProposals
            .map((p) => refId(p.packageId))
            .filter(Boolean)
    )];

    const contractorMap = new Map<string, string>();
    if (packageIds.length > 0) {
        const tenders = await Tender.find({
            packageId: { $in: packageIds },
            cancelled: { $ne: true },
            contractorName: { $exists: true, $ne: '' },
        } as unknown as TenderFilter)
            .sort({ trialNo: -1 })
            .select('packageId contractorName')
            .lean();

        for (const t of tenders) {
            const key = String(t.packageId);
            if (!contractorMap.has(key)) {
                contractorMap.set(key, t.contractorName || '');
            }
        }
    }

    const enrichedProposals = rawProposals.map((p) => {
        const pkgId = refId(p.packageId);
        return {
            ...p,
            contractorName: pkgId ? (contractorMap.get(pkgId) || '') : '',
        };
    });

    const proposals = serialize(enrichedProposals) as unknown as Proposal[];
    const packages = serialize(rawPackages) as unknown as PackageOption[];

    return (
        <ExcessProposalsClient 
            initialProposals={proposals}
            packages={packages}
        />
    );
}
