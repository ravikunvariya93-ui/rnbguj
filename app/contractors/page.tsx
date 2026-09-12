'use client';

import { useState, useEffect } from 'react';
import { 
    User, Plus, Search, Edit2, Trash2, 
    Phone, MapPin, Building, Loader2, AlertCircle 
} from 'lucide-react';
import ContractorForm from '@/components/ContractorForm';

export default function ContractorsListPage() {
    const [contractors, setContractors] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedContractor, setSelectedContractor] = useState<any>(null);

    const fetchContractors = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/agencies');
            if (!res.ok) throw new Error('Failed to fetch contractors');
            const data = await res.json();
            setContractors(data.data || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContractors();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete contractor "${name}"?`)) return;

        try {
            const res = await fetch(`/api/agencies/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete contractor');
            }
            fetchContractors();
        } catch (err: any) {
            alert(err.message);
        }
    };

    const filteredContractors = contractors.filter(c => 
        c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.proprietorName?.toLowerCase().includes(search.toLowerCase()) ||
        c.mobileNo?.includes(search) ||
        c.gstNo?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <User className="h-7 w-7 text-emerald-600" />
                        Contractor List
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage contractors and agencies.</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedContractor(null);
                        setIsFormOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                    <Plus className="h-5 w-5" />
                    Add New Contractor
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, proprietor, mobile, or GST..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                        />
                    </div>
                    {loading && <Loader2 className="h-5 w-5 text-emerald-600 animate-spin" />}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider font-semibold">
                            <tr>
                                <th className="px-6 py-4">Contractor Name</th>
                                <th className="px-6 py-4">Proprietor</th>
                                <th className="px-6 py-4">Address</th>
                                <th className="px-6 py-4">Mobile No.</th>
                                <th className="px-6 py-4">Type</th>
                                <th className="px-6 py-4">GST No.</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading && contractors.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center">
                                        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-2" />
                                        <p className="text-gray-500 text-sm">Loading contractors...</p>
                                    </td>
                                </tr>
                            ) : filteredContractors.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        No contractors found.
                                    </td>
                                </tr>
                            ) : (
                                filteredContractors.map((contractor) => (
                                    <tr key={contractor._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
                                                    <Building className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{contractor.name}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {contractor.proprietorName || '-'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-600 max-w-[200px]">
                                                <MapPin className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                                <span className="truncate">{contractor.address || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-sm text-gray-700">
                                                <Phone className="h-3.5 w-3.5 text-gray-400" />
                                                {contractor.mobileNo || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {contractor.agencyType || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 font-mono text-xs">
                                            {contractor.gstNo || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedContractor(contractor);
                                                        setIsFormOpen(true);
                                                    }}
                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title="Edit Contractor"
                                                >
                                                    <Edit2 className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(contractor._id, contractor.name)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Contractor"
                                                >
                                                    <Trash2 className="h-5 w-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {isFormOpen && (
                <ContractorForm
                    contractor={selectedContractor}
                    onClose={() => setIsFormOpen(false)}
                    onSave={fetchContractors}
                />
            )}
        </div>
    );
}
