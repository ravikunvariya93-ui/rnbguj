'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Search, FileText, Trash2, ExternalLink } from 'lucide-react';

export default function BOQListPage() {
    const [boqs, setBoqs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchBoqs();
    }, []);

    const fetchBoqs = async () => {
        try {
            const res = await fetch('/api/boqs');
            const data = await res.json();
            if (data.success) {
                setBoqs(data.data);
            }
        } catch (error) {
            console.error("Failed to fetch BOQs", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this BOQ?')) return;
        try {
            const res = await fetch(`/api/boqs/${id}`, { method: 'DELETE' });
            if (res.ok) {
                setBoqs(boqs.filter(b => b._id !== id));
            }
        } catch (error) {
            console.error(error);
        }
    };

    const filteredBoqs = boqs.filter(b => 
        b.tenderId?.tenderId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.tenderId?.packageName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center sm:items-end flex-wrap gap-4">
                <div>
                    <h1 className="text-2xl font-bold font-heading text-gray-900">Bill of Quantities (BOQ)</h1>
                    <p className="text-gray-500 mt-1">Manage detailed schedules of items and specifications.</p>
                </div>
                <Link
                    href="/boqs/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all transform hover:-translate-y-0.5"
                >
                    <Plus className="w-5 h-5 mr-2" /> New BOQ
                </Link>
            </div>

            <div className="flex items-center bg-white rounded-lg shadow-sm border border-gray-200 px-3 py-2">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by tender ID or package name..."
                    className="ml-2 block w-full text-sm border-none focus:ring-0"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            <div className="bg-white shadow rounded-lg border border-gray-200 overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Tender</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Items Count</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Total Amount</th>
                            <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Last Updated</th>
                            <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {loading ? (
                            <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400">Loading data...</td></tr>
                        ) : filteredBoqs.length === 0 ? (
                            <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400 italic">No BOQ records found matching "{searchTerm}"</td></tr>
                        ) : filteredBoqs.map((boq) => (
                            <tr key={boq._id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="text-sm font-bold text-gray-900">{boq.tenderId?.tenderId || 'N/A'}</div>
                                    <div className="text-xs text-gray-500 truncate max-w-md">{boq.tenderId?.packageName || 'N/A'}</div>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">{boq.items?.length || 0} items</td>
                                <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                                    ₹{boq.totalAmount?.toLocaleString('en-IN')}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-500">
                                    {new Date(boq.updatedAt).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right space-x-3">
                                    <Link href={`/boqs/${boq._id}`} className="inline-flex text-blue-600 hover:text-blue-900 transition-colors">
                                        <ExternalLink className="w-5 h-5" />
                                    </Link>
                                    <button onClick={() => handleDelete(boq._id)} className="text-red-600 hover:text-red-900 transition-colors">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
