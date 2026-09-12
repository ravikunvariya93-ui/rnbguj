'use client';

import { useState, useEffect } from 'react';
import { X, User, MapPin, Phone, Building, FileText, Loader2 } from 'lucide-react';

interface ContractorFormProps {
    contractor?: any;
    onClose: () => void;
    onSave: () => void;
}

export default function ContractorForm({ contractor, onClose, onSave }: ContractorFormProps) {
    const [formData, setFormData] = useState({
        name: '',
        proprietorName: '',
        address: '',
        mobileNo: '',
        agencyType: '',
        gstNo: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (contractor) {
            setFormData({
                name: contractor.name || '',
                proprietorName: contractor.proprietorName || '',
                address: contractor.address || '',
                mobileNo: contractor.mobileNo || '',
                agencyType: contractor.agencyType || '',
                gstNo: contractor.gstNo || '',
            });
        }
    }, [contractor]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const url = contractor ? `/api/agencies/${contractor._id}` : '/api/agencies';
        const method = contractor ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save contractor');
            }

            onSave();
            onClose();
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <User className="h-5 w-5 text-emerald-600" />
                        {contractor ? 'Edit Contractor' : 'Add New Contractor'}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Contractor / Agency Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Building className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="e.g. Bhavnagar Construction Co."
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Proprietor Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={formData.proprietorName}
                                    onChange={(e) => setFormData({ ...formData, proprietorName: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="e.g. Ramesh Patel"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Address</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="e.g. Station Road, Bhavnagar"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Mobile No.</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={formData.mobileNo}
                                    onChange={(e) => setFormData({ ...formData, mobileNo: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="e.g. 9876543210"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Agency Type</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FileText className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={formData.agencyType}
                                    onChange={(e) => setFormData({ ...formData, agencyType: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="e.g. Civil, Electrical"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">GST No.</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FileText className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    value={formData.gstNo}
                                    onChange={(e) => setFormData({ ...formData, gstNo: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="e.g. 24AAAAA0000A1Z5"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 transition-all text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 px-4 border border-transparent text-white font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition-all disabled:opacity-70 disabled:cursor-not-allowed text-sm flex items-center justify-center gap-2"
                        >
                            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                            {contractor ? 'Update Contractor' : 'Create Contractor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
