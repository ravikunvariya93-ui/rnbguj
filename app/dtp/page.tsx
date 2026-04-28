import { Suspense } from 'react';
import dbConnect from '@/lib/db';
import DTP from '@/models/DTP';
import Package from '@/models/Package';
import Link from 'next/link';
import { Plus, Filter, Eye, Edit2 } from 'lucide-react';
import SearchBar from '@/components/SearchBar';
import Pagination from '@/components/Pagination';
import GenericDeleteButton from '@/components/GenericDeleteButton';
import SortableHeader from '@/components/SortableHeader';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: { search?: string; page?: string; limit?: string ; sort?: string; order?: string }
}

export default async function DTPListPage({ searchParams }: Props) {
    await dbConnect();
    const params = await searchParams;
    
    let query: any = {};
    if (params.search) {
        const matchingPackages = await Package.find({
            packageName: { $regex: params.search, $options: 'i' }
        }).distinct('_id');
        query.tsId = { $in: matchingPackages };
    }

    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '100');
    const skip = (page - 1) * limit;

    let sortObj: any = { createdAt: -1 };
    if (params.sort && params.order) {
        sortObj = { [params.sort]: params.order === 'asc' ? 1 : -1 };
    }


    const totalItems = await DTP.countDocuments(query);
    const totalPages = Math.ceil(totalItems / limit);

    const dtpsRaw = await DTP.find(query)
        .populate('tsId')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean();
    const dtps = dtpsRaw.map((dtp: any) => ({
        ...dtp,
        _id: dtp._id.toString(),
    }));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-2xl font-semibold text-gray-900">DTP</h1>
                        {params.search && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Filter className="w-3 h-3 mr-1" /> Search Active
                            </span>
                        )}
                    </div>
                    <p className="mt-2 text-sm text-gray-700">List of all Detailed Technical Proposals.</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <Link href="/dtp/new" className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" /> Add New DTP
                    </Link>
                </div>
            </div>

            <div className="mt-6 flex justify-start items-center">
                <Suspense fallback={<div className="h-10 w-full max-w-lg bg-gray-100 animate-pulse rounded-md" />}>
                    <SearchBar placeholder="Search by package name..." />
                </Suspense>
                {params.search && (
                    <Link href="/dtp" className="ml-4 text-sm text-blue-600 hover:text-blue-900">
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
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6 w-16">Sr. No.</th>
                                        <SortableHeader field="packageName" label="Package Name" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6" />

                                        <SortableHeader field="dtpapprovaldate" label="DTP Approval Date" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900" />
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 cursor-default text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {dtps.length === 0 ? (
                                        <tr><td colSpan={4} className="py-10 text-center text-sm text-gray-500">No DTP records found matching the criteria.</td></tr>
                                    ) : (
                                        dtps.map((dtp: any, index: number) => (
                                            <tr key={dtp._id}>
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">{skip + index + 1}</td>
                                                <td className="whitespace-normal py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-6 max-w-sm">
                                                    {(dtp.tsId as any)?.packageName || 'Unknown Package'}
                                                </td>



                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    {dtp.dtpApprovalDate ? new Date(dtp.dtpApprovalDate).toLocaleDateString('en-GB') : '-'}
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex items-center justify-end space-x-3">
                                                    <Link href={`/dtp/${dtp._id}`} className="text-gray-600 hover:text-gray-900 p-1" title="View Details">
                                                        <Eye className="w-5 h-5" />
                                                    </Link>
                                                    <Link href={`/dtp/${dtp._id}/edit`} className="text-blue-600 hover:text-blue-900 p-1" title="Edit Item">
                                                        <Edit2 className="w-5 h-5" />
                                                    </Link>
                                                    <GenericDeleteButton 
                                                        itemId={dtp._id} 
                                                        itemName={dtp.packageName || 'DTP'} 
                                                        apiPath="/api/dtps" 
                                                    />
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <Suspense fallback={<div className="h-10 w-full bg-gray-50 animate-pulse mt-4 rounded-md" />}>
                            <Pagination currentPage={page} totalPages={totalPages} />
                        </Suspense>
                    </div>
                </div>
            </div>
        </div>
    );
}
