import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import DTP from '@/models/DTP';
import Tender from '@/models/Tender';
import Link from 'next/link';
import { Plus, Filter, Edit } from 'lucide-react';
import DeletePackageButton from '@/components/DeletePackageButton';
import SearchBar from '@/components/SearchBar';

export const dynamic = 'force-dynamic';

interface Props {
    searchParams: { filter?: string; search?: string };
}

export default async function PackagesListPage({ searchParams }: Props) {
    await dbConnect();
    
    let query: any = {};
    let filterLabel = "List of all packages containing approved works.";

    if (searchParams.filter === 'pending_dtp') {
        const packagesWithDTP = await DTP.find().distinct('tsId'); // tsId in DTP refers to Package
        query._id = { $nin: packagesWithDTP };
        filterLabel = "Showing Packages awaiting Detailed Technical Proposal (Pending DTP).";
    } else if (searchParams.filter === 'pending_tender') {
        const packagesWithTender = await Tender.find().distinct('packageId');
        query._id = { $nin: packagesWithTender };
        filterLabel = "Showing Packages awaiting Tender publication (Pending Tender).";
    }

    if (searchParams.search) {
        query.packageName = { $regex: searchParams.search, $options: 'i' };
    }

    const packagesRaw = await Package.find(query).sort({ createdAt: -1 }).lean();
    const packages = packagesRaw.map((p: any) => ({
        ...p,
        _id: p._id.toString(),
    }));

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <div className="flex items-center space-x-2">
                        <h1 className="text-2xl font-semibold text-gray-900">Packages</h1>
                        {(searchParams.filter || searchParams.search) && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                <Filter className="w-3 h-3 mr-1" /> {searchParams.search ? 'Search Active' : 'Filter Active'}
                            </span>
                        )}
                    </div>
                    <p className="mt-2 text-sm text-gray-700">{filterLabel}</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <Link href="/packages/new" className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto">
                        <Plus className="w-4 h-4 mr-2" /> Add New Package
                    </Link>
                </div>
            </div>

            <div className="mt-6 flex justify-start items-center">
                <SearchBar placeholder="Search by package name..." />
                {(searchParams.filter || searchParams.search) && (
                    <Link href="/packages" className="ml-4 text-sm text-blue-600 hover:text-blue-900">
                        Clear all filters
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
                                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Estimated Amount</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 cursor-default text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {packages.length === 0 ? (
                                        <tr><td colSpan={3} className="py-10 text-center text-sm text-gray-500">No packages found matching the criteria.</td></tr>
                                    ) : (
                                        packages.map((pkg: any) => (
                                            <tr key={pkg._id}>
                                                <td className="whitespace-normal py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6 max-w-lg" style={{ wordBreak: 'break-word' }}>{pkg.packageName}</td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                    ₹{(pkg.estimatedAmount || 0).toLocaleString('en-IN')}
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6 flex items-center justify-end space-x-2">
                                                    <Link href={`/packages/${pkg._id}/edit`} className="text-blue-600 hover:text-blue-900 p-2" title="Edit Package">
                                                        <Edit className="w-5 h-5" />
                                                    </Link>
                                                    <DeletePackageButton packageId={pkg._id} packageName={pkg.packageName} />
                                                </td>
                                            </tr>
                                        ))
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
