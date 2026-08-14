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
    return JSON.parse(JSON.stringify(obj));
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

    const proposals = serialize(rawProposals);
    const packages = serialize(rawPackages);

    return (
        <ExcessProposalsClient 
            initialProposals={proposals}
            packages={packages}
        />
    );
}
