import dbConnect from '@/lib/db';
import BOQ from '@/models/BOQ';
import Link from 'next/link';
import { ArrowLeft, Edit2, FileText, Download } from 'lucide-react';
import { notFound } from 'next/navigation';

export default async function BOQDetailPage({ params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    const boq = await BOQ.findById(id).populate('tenderId').lean();

    if (!boq) {
        notFound();
    }

    const tender = boq.tenderId as any;

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="mb-8 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Link href="/boqs" className="text-gray-500 hover:text-gray-700 transition-colors">
                        <ArrowLeft className="w-6 h-6" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 font-heading">BOQ Details</h1>
                        <p className="text-sm text-gray-500">Tender: {tender?.tenderId || 'N/A'}</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">
                        <Download className="w-4 h-4 mr-2" /> PDF Export
                    </button>
                    <Link
                        href={`/boqs/${id}/edit`}
                        className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                    >
                        <Edit2 className="w-4 h-4 mr-2" /> Edit BOQ
                    </Link>
                </div>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                <div className="px-4 py-5 sm:px-6 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg leading-6 font-bold text-gray-900">{tender?.packageName || 'Project Title'}</h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500 italic">Bill of Quantities for Tender {tender?.tenderId}</p>
                    </div>
                    <div className="text-right">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Amount</span>
                        <div className="text-2xl font-black text-blue-600">₹{boq.totalAmount?.toLocaleString('en-IN')}</div>
                    </div>
                </div>
                
                <div className="px-4 py-5 sm:p-0">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-16 text-center">No.</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Description of Item</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Qty</th>
                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Unit</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Rate</th>
                                <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {boq.items?.map((item: any, index: number) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-gray-900 text-center font-medium">{item.itemNo}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{item.description}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">{item.quantity?.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500 font-medium">{item.unit}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-medium">₹{item.rate?.toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm text-gray-900 text-right font-bold text-blue-600">₹{item.amount?.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                            <tr>
                                <td colSpan={5} className="px-6 py-4 text-right text-sm font-black text-gray-900 uppercase tracking-wider">Grand Total (Excl. GST)</td>
                                <td className="px-6 py-4 text-right text-base font-black text-blue-700">₹{boq.totalAmount?.toLocaleString('en-IN')}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </div>
    );
}
