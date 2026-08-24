import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Package from '@/models/Package';
import Link from 'next/link';
import { Eye, Edit2 } from 'lucide-react';
import GenericDeleteButton from '@/components/GenericDeleteButton';
import Pagination from '@/components/Pagination';
import ListPageLayout from '@/components/ListPageLayout';
import DataTable from '@/components/DataTable';
import { parsePagination, parseSort } from '@/lib/queryHelpers';
import type { ListPageSearchParams, Column } from '@/lib/types';
import { auth } from '@/auth';
import { isAuditorRole, getAuditorSubDivision } from '@/lib/roles';

// Ensure models are registered for populate
void WorkOrder;
void LOA;
void Tender;
void Package;

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: Promise<ListPageSearchParams>;
}

export default async function BillsPage({ searchParams }: Props) {
    await dbConnect();
    const session = await auth();
    const userRole = (session?.user as any)?.role;
    const auditorSubDivision = getAuditorSubDivision(userRole);
    const isAuditor = isAuditorRole(userRole);

    const params = await searchParams;
    
    // Build base query — auditors are limited to their subDivision
    let query: any = {};

    // If auditor, find WorkOrder IDs that belong to their subDivision (via Package.subDivision)
    if (isAuditor && auditorSubDivision) {
        const packageIds = (await Package.find({
            subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') }
        }).distinct('_id')) as any[];
        const tenderIds = (await Tender.find({ packageId: { $in: packageIds } }).distinct('_id')) as any[];
        const loaIds = (await LOA.find({ tenderId: { $in: tenderIds } }).distinct('_id')) as any[];
        const workOrderIds = (await WorkOrder.find({ loaId: { $in: loaIds } }).distinct('_id')) as any[];
        query.workOrderId = { $in: workOrderIds };
    }

    if (params.search) {
        // Find matching Tenders by package name
        let matchingPackageIds: any[] = [];
        const packageSearchFilter: any = {
            packageName: { $regex: params.search, $options: 'i' }
        };
        // Restrict to auditor's subDivision if applicable
        if (isAuditor && auditorSubDivision) {
            packageSearchFilter.subDivision = { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') };
        }
        matchingPackageIds = (await Package.find(packageSearchFilter).distinct('_id')) as any[];

        const matchingTenders = (await Tender.find({ packageId: { $in: matchingPackageIds } }).distinct('_id')) as any[];
        const matchingLOAs = (await LOA.find({ tenderId: { $in: matchingTenders } }).distinct('_id')) as any[];
        const matchingWorkOrders = (await WorkOrder.find({ loaId: { $in: matchingLOAs } }).distinct('_id')) as any[];
        query.workOrderId = { $in: matchingWorkOrders };
    }

    const { page, limit, skip } = parsePagination(params);
    const sortObj = parseSort(params, { createdAt: -1 });

    const totalItems = await Bill.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const billsRaw = await Bill.find(query)
        .populate({
            path: 'workOrderId',
            populate: {
                path: 'loaId',
                populate: { path: 'tenderId' }
            }
        })
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();

    const bills = billsRaw.map((bill: any) => ({
        ...bill,
        _id: bill._id.toString(),
    }));

    const columns: Column[] = [
        { 
            key: 'billtype/no.', 
            label: 'Bill Type / No.', 
            sortable: true,
            render: (row) => {
                const tender = (row.workOrderId as any)?.loaId?.tenderId;
                const packageId = tender?.packageId;
                const nth = row.runningBillNumber === 1 ? 'st' : row.runningBillNumber === 2 ? 'nd' : row.runningBillNumber === 3 ? 'rd' : 'th';
                const label = `${row.runningBillNumber}${nth} and ${row.billType} Bill`;
                return packageId ? (
                    <Link href={`/packages/${packageId}/bills/${row._id}/deduction`} className="text-emerald-700 hover:underline font-semibold" target="_blank" rel="noopener noreferrer">
                        {label}
                    </Link>
                ) : (
                    <span>{label}</span>
                );
            }
        },
        { 
            key: 'package/workorder', 
            label: 'Package / Work Order', 
            sortable: true,
            minWidth: '200px',
            render: (row) => {
                const tender = (row.workOrderId as any)?.loaId?.tenderId;
                return tender?.packageId ? (
                    <Link href={`/packages/${tender.packageId}`} className="text-emerald-600 hover:underline font-semibold max-w-xs whitespace-normal break-words">
                        {tender.packageName || 'Unknown Package'}
                    </Link>
                ) : (
                    <span className="max-w-xs whitespace-normal break-words font-medium">{tender?.packageName || 'Unknown Package'}</span>
                )
            }
        },
        { 
            key: 'grossamount', 
            label: 'Gross Amount', 
            sortable: true,
            render: (row) => <span className="font-mono">₹{row.grossAmount?.toLocaleString('en-IN')}</span>
        },
        { 
            key: 'billdate', 
            label: 'Bill Date', 
            sortable: true,
            render: (row) => row.billDate ? new Date(row.billDate).toLocaleDateString('en-GB') : '-'
        }
    ];

    const renderActions = (row: any) => {
        const tender = (row.workOrderId as any)?.loaId?.tenderId;
        const packageId = tender?.packageId;
        const viewHref = packageId ? `/packages/${packageId}/bills/${row._id}/deduction` : `/bills`;
        const editHref = packageId ? `/packages/${packageId}/bills/${row._id}/edit` : `/bills`;

        return (
            <div className="flex items-center justify-end space-x-3">
                <Link href={viewHref} className="text-gray-600 hover:text-emerald-700 p-1 transition-colors" title="View Details in Package">
                    <Eye className="w-5 h-5" />
                </Link>
                <Link href={editHref} className="text-emerald-600 hover:text-emerald-900 p-1 transition-colors" title="Edit Item">
                    <Edit2 className="w-5 h-5" />
                </Link>
                <GenericDeleteButton 
                    itemId={row._id} 
                    itemName={`Bill ${row.runningBillNumber}`} 
                    apiPath="/api/bills" 
                />
            </div>
        );
    };

    return (
        <ListPageLayout
            title={isAuditor ? `Bills — ${auditorSubDivision}` : 'Bills'}
            subtitle={isAuditor 
                ? `Showing bills for ${auditorSubDivision} sub-division only.`
                : 'A list of all project bills including running and final bills.'
            }
            addHref="/bills/new"
            addLabel="Add Bill"
            searchPlaceholder="Search by package name..."
            filterActive={!!params.search}
            clearFiltersHref="/bills"
        >
            <DataTable 
                columns={columns} 
                data={bills} 
                emptyMessage="No bills found."
                actions={renderActions}
            />
            <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
        </ListPageLayout>
    );
}
