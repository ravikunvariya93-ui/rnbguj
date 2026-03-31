import dbConnect from '@/lib/db';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Link from 'next/link';
import { Plus, Filter } from 'lucide-react';
import SearchBar from '@/components/SearchBar';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: { search?: string };
}

import DeleteWorkOrderButton from '@/components/DeleteWorkOrderButton';

export default async function WorkOrderListPage({ searchParams }: Props) {
    await dbConnect();
    
    let query: any = {};
    if (searchParams.search) {
        // Find matching Tenders
        const matchingTenders = await Tender.find({
            $or: [
                { packageName: { $regex: searchParams.search, $options: 'i' } },
                { contractorName: { $regex: searchParams.search, $options: 'i' } }
            ]
        }).distinct('_id');

        // Find matching LOAs for those Tenders
        const matchingLOAs = await LOA.find({
            tenderId: { $in: matchingTenders }
        }).distinct('_id');

        // Filter WorkOrders by those LOAs
        query.loaId = { $in: matchingLOAs };
    }

    const workOrdersRaw = await WorkOrder.find(query)
        .populate({
            path: 'loaId',
            populate: { path: 'tenderId' }
        })
        .sort({ createdAt: -1 })
        .lean();

    const workOrders = workOrdersRaw.map((wo: any) => ({
        ...wo,
        _id: wo._id.toString(),
    }));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-2xl font-semibold text-gray-900">Work Orders</h1>
                        {searchParams.search && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Filter className="w-3 h-3 mr-1" /> Search Active
                            </span>
                        )}
                    </div>
                    <p className="mt-2 text-sm text-gray-700">List of all Work Orders issued.</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <Link href="/work-orders/new" className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" /> Add New Work Order
                    </Link>
                </div>
            </div>

            <div className="mt-6 flex justify-start items-center">
                <SearchBar placeholder="Search by package or contractor..." />
                {searchParams.search && (
                    <Link href="/work-orders" className="ml-4 text-sm text-blue-600 hover:text-blue-900">
                        Clear filters
                    </Link>
                )}
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Package Name</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Contractor Name</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Work Order Date</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 cursor-default text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {workOrders.length === 0 ? (
                                        <tr><td colSpan={4} className="py-10 text-center text-sm text-gray-500">No Work Orders found matching the search.</td></tr>
                                    ) : (
                                        workOrders.map((wo: any) => {
                                            const tender = (wo.loaId as any)?.tenderId;
                                            return (
                                                <tr key={wo._id}>
                                                    <td className="whitespace-normal py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6 max-w-sm">
                                                        {tender?.packageName || '-'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        {tender?.contractorName || '-'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        {wo.workOrderDate ? new Date(wo.workOrderDate).toLocaleDateString('en-GB') : '-'}
                                                    </td>
                                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 space-x-2">
                                                        <Link href={`/work-orders/${wo._id}/edit`} className="text-blue-600 hover:text-blue-900 transition-colors inline-block p-1 mt-1">Edit</Link>
                                                        <DeleteWorkOrderButton 
                                                            workOrderId={wo._id} 
                                                            packageName={tender?.packageName || 'Work Order'} 
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
