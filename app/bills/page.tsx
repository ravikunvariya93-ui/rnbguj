import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';
import Link from 'next/link';
import { Plus, Edit2, Eye } from 'lucide-react';

export default async function BillsPage() {
    await dbConnect();
    const bills = await Bill.find({})
        .populate({
            path: 'workOrderId',
            populate: {
                path: 'loaId',
                populate: { path: 'tenderId' }
            }
        })
        .sort({ createdAt: -1 })
        .lean();

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="sm:flex sm:items-center">
                <div className="sm:flex-auto">
                    <h1 className="text-2xl font-semibold text-gray-900">Bills</h1>
                    <p className="mt-2 text-sm text-gray-700">A list of all project bills including running and final bills.</p>
                </div>
                <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
                    <Link
                        href="/bills/new"
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto transition-colors"
                    >
                        <Plus className="w-4 h-4 mr-2" /> Add Bill
                    </Link>
                </div>
            </div>

            <div className="mt-8 flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg border border-gray-200">
                            <table className="min-w-full divide-y divide-gray-300">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider sm:pl-6">Bill Type / No.</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Package / Work Order</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Gross Amount</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Bill Date</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                                            <span className="sr-only">Actions</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 bg-white">
                                    {bills.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-10 text-center text-gray-500 italic">No bills found. Click &quot;Add Bill&quot; to create one.</td>
                                        </tr>
                                    ) : (
                                        bills.map((bill: any) => {
                                            const tender = bill.workOrderId?.loaId?.tenderId;
                                            return (
                                                <tr key={bill._id.toString()} className="hover:bg-gray-50 transition-colors">
                                                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                                                        {bill.billType === 'Running' ? `${bill.runningBillNumber}${bill.runningBillNumber === 1 ? 'st' : bill.runningBillNumber === 2 ? 'nd' : bill.runningBillNumber === 3 ? 'rd' : 'th'} Running` : 'Final Bill'}
                                                    </td>
                                                    <td className="px-3 py-4 text-sm text-gray-500 max-w-xs truncate">
                                                        {tender?.packageName || 'Unknown Package'}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 font-semibold font-mono">
                                                        ₹{bill.grossAmount?.toLocaleString('en-IN')}
                                                    </td>
                                                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                        {bill.billDate ? new Date(bill.billDate).toLocaleDateString('en-GB') : '-'}
                                                    </td>
                                                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                                        <div className="flex justify-end space-x-3">
                                                            <Link href={`/bills/${bill._id}`} className="text-gray-400 hover:text-blue-600 transition-colors">
                                                                <Eye className="w-5 h-5" />
                                                            </Link>
                                                            <Link href={`/bills/${bill._id}/edit`} className="text-gray-400 hover:text-indigo-600 transition-colors">
                                                                <Edit2 className="w-5 h-5" />
                                                            </Link>
                                                        </div>
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
