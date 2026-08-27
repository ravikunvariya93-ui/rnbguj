import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Package from '@/models/Package';
import Agency from '@/models/Agency';
import Link from 'next/link';
import Pagination from '@/components/Pagination';
import ListPageLayout from '@/components/ListPageLayout';
import DataTable from '@/components/DataTable';
import AgreementsFilterBar from '@/components/AgreementsFilterBar';
import { parsePagination, parseSort } from '@/lib/queryHelpers';
import type { ListPageSearchParams, Column } from '@/lib/types';
import { formatShortDate, parseDateStr } from '@/lib/dateUtils';
import ApprovedWork from '@/models/ApprovedWork';
import { auth } from '@/auth';
import { isAuditorRole, getAuditorSubDivision } from '@/lib/roles';

// Register models for populating nested relationships
void LOA;
void Tender;
void Package;
void ApprovedWork;

export const dynamic = 'force-dynamic';

interface AgreementsSearchParams extends ListPageSearchParams {
    agreementYear?: string;
    priceRange?: string;
    fromDate?: string;
    toDate?: string;
}

interface Props {
    searchParams: Promise<AgreementsSearchParams>;
}

export default async function AgreementsListPage({ searchParams }: Props) {
    await dbConnect();
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const auditorSubDivision = getAuditorSubDivision(userRole);
    const isAuditor = isAuditorRole(userRole);

    const params = await searchParams;

    // Fetch filters metadata (subdivisions are no longer required)
    const [rawAgencies, years] = await Promise.all([
        Agency.find({}).select('name').sort({ name: 1 }).lean() as Promise<any[]>,
        WorkOrder.distinct('agreementYear', { notRequired: { $ne: true } }) as Promise<string[]>
    ]);

    const agencies = rawAgencies.map((a: any) => ({
        ...a,
        _id: a._id.toString()
    }));

    let query: any = { notRequired: { $ne: true } };
    let filterLabels: string[] = [];

    // Search filter
    if (params.search) {
        const cleanSearch = params.search.trim();

        // 1. Direct matches in WorkOrder
        const directWoMatches = await WorkOrder.find({
            $or: [
                { agreementNo: { $regex: cleanSearch, $options: 'i' } },
                { agreementYear: { $regex: cleanSearch, $options: 'i' } },
                { workOrderWorksheetNo: { $regex: cleanSearch, $options: 'i' } }
            ]
        } as any).distinct('_id') as any[];

        // 2. Matches in Package Name (Package model)
        const matchingPkgs = await Package.find({
            packageName: { $regex: cleanSearch, $options: 'i' }
        } as any).distinct('_id') as any[];

        // 3. Matches in Tender (contractorName, tenderId, packageName, or matching packageIds)
        const matchingTenders = await Tender.find({
            $or: [
                { contractorName: { $regex: cleanSearch, $options: 'i' } },
                { tenderId: { $regex: cleanSearch, $options: 'i' } },
                { packageName: { $regex: cleanSearch, $options: 'i' } },
                { packageId: { $in: matchingPkgs } }
            ]
        } as any).distinct('_id') as any[];

        // 4. Matches in LOA (referencing matching Tenders)
        const matchingLoas = await LOA.find({
            tenderId: { $in: matchingTenders }
        } as any).distinct('_id') as any[];

        // 5. Indirect matches in WorkOrder referencing matching LOAs
        const indirectWoMatches = await WorkOrder.find({
            loaId: { $in: matchingLoas }
        } as any).distinct('_id') as any[];

        // Combine direct and indirect matches
        const allMatchingWoIds = Array.from(new Set([
            ...directWoMatches.map(id => id.toString()),
            ...indirectWoMatches.map(id => id.toString())
        ]));

        query._id = { $in: allMatchingWoIds };
    }

    // Filter by Contractor Name & Contract Price Range (requires querying Tender relationship)
    let tenderQuery: any = {};
    let hasTenderFilter = false;

    if (params.contractorName) {
        tenderQuery.contractorName = params.contractorName;
        hasTenderFilter = true;
        filterLabels.push(`Contractor: ${params.contractorName}`);
    }

    if (params.priceRange) {
        if (params.priceRange === 'gte_25l') {
            tenderQuery.contractPrice = { $gte: 2500000 };
            filterLabels.push('Contract Price: ≥ 25,00,000 (Equal or more than 25 Lakhs)');
        } else if (params.priceRange === 'lt_25l') {
            tenderQuery.contractPrice = { $lt: 2500000 };
            filterLabels.push('Contract Price: < 25,00,000 (Less than 25 Lakhs)');
        }
        hasTenderFilter = true;
    }

    if (hasTenderFilter) {
        const matchingTenders = await Tender.find(tenderQuery as any).distinct('_id') as any[];
        const matchingLoas = await LOA.find({ tenderId: { $in: matchingTenders } } as any).distinct('_id') as any[];
        const matchingWoIds = await WorkOrder.find({ loaId: { $in: matchingLoas } } as any).distinct('_id') as any[];
        const matchingWoIdsStr = matchingWoIds.map(id => id.toString());

        if (query._id) {
            const directWoIds = query._id.$in;
            const intersected = directWoIds.filter((id: string) => matchingWoIdsStr.includes(id));
            query._id = { $in: intersected };
        } else {
            query._id = { $in: matchingWoIds };
        }
    }

    if (isAuditor && auditorSubDivision) {
        const worksInAuditorSubDiv = await ApprovedWork.find({ subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') } }).select('workName').lean();
        const workNames = worksInAuditorSubDiv.map((aw: any) => aw.workName).filter(Boolean);
        const matchingPkgs = await Package.find({
            $or: [
                { subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') } },
                { 'works.workName': { $in: workNames } }
            ]
        } as any).distinct('_id') as any[];
        const matchingTenders = await Tender.find({ packageId: { $in: matchingPkgs } } as any).distinct('_id') as any[];
        const matchingLoas = await LOA.find({ tenderId: { $in: matchingTenders } } as any).distinct('_id') as any[];
        const matchingWoIds = await WorkOrder.find({ loaId: { $in: matchingLoas } } as any).distinct('_id') as any[];
        const matchingWoIdsStr = matchingWoIds.map(id => id.toString());

        if (query._id) {
            const directWoIds = query._id.$in || [];
            const intersected = directWoIds.filter((id: string) => matchingWoIdsStr.includes(id));
            query._id = { $in: intersected };
        } else {
            query._id = { $in: matchingWoIds };
        }
        filterLabels.push(`Sub Division: ${auditorSubDivision}`);
    }

    // Agreement Year filter
    if (params.agreementYear) {
        query.agreementYear = params.agreementYear;
        filterLabels.push(`Agreement Year: ${params.agreementYear}`);
    }

    // To From Date range filter on agreementDate
    if (params.fromDate || params.toDate) {
        query.agreementDate = {};
        if (params.fromDate) {
            const fromDateObj = parseDateStr(params.fromDate) || new Date(params.fromDate);
            fromDateObj.setHours(0, 0, 0, 0);
            query.agreementDate.$gte = fromDateObj;
            filterLabels.push(`From Date: ${formatShortDate(fromDateObj)}`);
        }
        if (params.toDate) {
            const toDateObj = parseDateStr(params.toDate) || new Date(params.toDate);
            toDateObj.setHours(23, 59, 59, 999);
            query.agreementDate.$lte = toDateObj;
            filterLabels.push(`To Date: ${formatShortDate(toDateObj)}`);
        }
    }

    const { page, limit, skip } = parsePagination(params);
    const sortObj = parseSort(params, { agreementYear: -1, agreementNo: 1 });

    const totalItems = await WorkOrder.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const workOrdersRaw = await WorkOrder.find(query)
        .populate({
            path: 'loaId',
            populate: {
                path: 'tenderId',
                populate: { path: 'packageId' }
            }
        })
        .collation({ locale: "en_US", numericOrdering: true })
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

    const workOrders = workOrdersRaw.map((wo: any) => ({
        ...wo,
        _id: wo._id.toString()
    }));

    const columns: Column[] = [
        { key: 'agreementYear', label: 'Agreement Year', sortable: true },
        { key: 'agreementNo', label: 'Agreement No.', sortable: true },
        {
            key: 'agreementDate',
            label: 'Agreement Date',
            sortable: true,
            render: (row) => <span className="text-slate-600">{formatShortDate(row.agreementDate)}</span>
        },
        { 
            key: 'packageName', 
            label: 'Package Name',
            minWidth: '200px', 
            render: (row) => {
                const tender = row.loaId?.tenderId;
                const pkg = tender?.packageId;
                const pkgName = pkg?.packageName || tender?.packageName || '-';
                if (pkg?._id) {
                    return (
                        <Link href={`/packages/${pkg._id}`} className="text-emerald-600 hover:underline font-semibold break-words">
                            {pkgName}
                        </Link>
                    );
                }
                return <span className="break-words">{pkgName}</span>;
            }
        },
        {
            key: 'contractorName',
            label: 'Contractor Name',
            render: (row) => row.loaId?.tenderId?.contractorName || '-'
        },
        {
            key: 'contractPrice',
            label: 'Contract Price',
            align: 'right',
            render: (row) => {
                const price = row.loaId?.tenderId?.contractPrice;
                return (price !== undefined && price !== null) ? `₹${price.toLocaleString('en-IN')}` : '-';
            }
        },
        {
            key: 'workOrderDate',
            label: 'Work Order Date',
            sortable: true,
            render: (row) => <span className="text-slate-600">{formatShortDate(row.workOrderDate)}</span>
        },
        {
            key: 'timeLimitStartsFrom',
            label: 'Time Limit Starts From',
            sortable: true,
            render: (row) => <span className="text-slate-600">{formatShortDate(row.timeLimitStartsFrom)}</span>
        }
    ];

    const filterLabel = filterLabels.length > 0 ? `Filtered by: ${filterLabels.join(' | ')}` : "List of all agreements.";

    const hasFilters = !!(params.agreementYear || params.search || params.contractorName || params.priceRange || params.fromDate || params.toDate);

    return (
        <ListPageLayout
            title="Agreement Register"
            subtitle={filterLabel}
            searchPlaceholder="Search by Agreement No, Package, or Contractor..."
            filterActive={hasFilters}
            clearFiltersHref="/agreements"
        >
            <AgreementsFilterBar agencies={agencies} years={years} />
            <DataTable 
                columns={columns} 
                data={workOrders} 
                emptyMessage="No agreements found matching the criteria."
                exportFilename="Agreements_Register.xlsx"
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
