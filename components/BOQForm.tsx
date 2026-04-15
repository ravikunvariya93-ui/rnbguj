'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Plus, Trash2, Upload, Loader2, FileText } from 'lucide-react';
import Link from 'next/link';
import SearchableSelect from './SearchableSelect';

interface BOQItem {
    itemNo: string;
    description: string;
    quantity: number;
    unit: string;
    rate: number;
    amount: number;
}

interface BOQFormProps {
    initialData?: any;
    isEditing?: boolean;
}

export default function BOQForm({ initialData = {}, isEditing = false }: BOQFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [parsing, setParsing] = useState(false);
    const [tenders, setTenders] = useState<any[]>([]);
    
    const [formData, setFormData] = useState({
        tenderId: initialData.tenderId?._id || initialData.tenderId || '',
        items: (initialData.items || []).map((item: any) => ({
            ...item,
            quantity: item.quantity || 0,
            rate: item.rate || 0,
            amount: item.amount || 0
        })),
        totalAmount: initialData.totalAmount || 0,
        ...initialData
    });

    useEffect(() => {
        const fetchTenders = async () => {
            try {
                const res = await fetch('/api/tenders');
                const data = await res.json();
                if (data.success) {
                    setTenders(data.data.map((t: any) => ({
                        ...t,
                        label: `${t.tenderId} - ${t.packageName}`
                    })));
                }
            } catch (error) {
                console.error("Failed to fetch tenders", error);
            }
        };
        fetchTenders();
    }, []);

    const handleAddItem = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { itemNo: '', description: '', quantity: 0, unit: '', rate: 0, amount: 0 }]
        }));
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...formData.items];
        newItems.splice(index, 1);
        const total = newItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
        setFormData(prev => ({ ...prev, items: newItems, totalAmount: total }));
    };

    const handleItemChange = (index: number, field: keyof BOQItem, value: any) => {
        const newItems = [...formData.items];
        const item = { ...newItems[index], [field]: value };
        
        // Auto calculate amount
        if (field === 'quantity' || field === 'rate') {
            item.amount = (parseFloat(item.quantity) || 0) * (parseFloat(item.rate) || 0);
        }
        
        newItems[index] = item;
        const total = newItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
        setFormData(prev => ({ ...prev, items: newItems, totalAmount: total }));
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setParsing(true);
        const uploadData = new FormData();
        uploadData.append('file', file);

        try {
            const res = await fetch('/api/boqs/parse-pdf', {
                method: 'POST',
                body: uploadData
            });
            const data = await res.json();
            if (data.success && data.data.length > 0) {
                const newItems = [...formData.items, ...data.data];
                const total = newItems.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
                setFormData(prev => ({ ...prev, items: newItems, totalAmount: total }));
            } else {
                alert('Could not extract any items from the PDF. Please check the format.');
            }
        } catch (error) {
            console.error(error);
            alert('Error parsing PDF');
        } finally {
            setParsing(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.tenderId) {
            alert('Please select a Tender');
            return;
        }
        if (formData.items.length === 0) {
            alert('Please add at least one item');
            return;
        }

        setLoading(true);
        try {
            const url = isEditing ? `/api/boqs/${initialData._id}` : '/api/boqs';
            const method = isEditing ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            if (!res.ok) throw new Error('Failed to save BOQ');
            router.push('/boqs');
            router.refresh();
        } catch (error) {
            console.error(error);
            alert('Error saving BOQ');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 shadow rounded-lg border border-gray-100">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-4">
                    <SearchableSelect 
                        label="Select Tender *"
                        required
                        options={tenders}
                        value={formData.tenderId}
                        onChange={(id) => setFormData(prev => ({ ...prev, tenderId: id }))}
                        placeholder="Search by Tender ID or Package Name..."
                    />
                </div>

                <div className="sm:col-span-2 flex items-end pb-1">
                    <label className="cursor-pointer inline-flex items-center px-4 py-2 border border-blue-300 shadow-sm text-sm font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none transition-all">
                        {parsing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                        {parsing ? 'Parsing PDF...' : 'Fetch from PDF'}
                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} disabled={parsing} />
                    </label>
                </div>

                <div className="sm:col-span-6 mt-4">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">BOQ Items</h3>
                        <button
                            type="button"
                            onClick={handleAddItem}
                            className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-white bg-green-600 hover:bg-green-700 shadow-sm transition-colors"
                        >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
                        </button>
                    </div>

                    <div className="overflow-x-auto border border-gray-200 rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">No.</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Description</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Qty</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Unit</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Rate</th>
                                    <th className="px-3 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Amount</th>
                                    <th className="px-3 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider w-12"></th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {formData.items.map((item: any, index: number) => (
                                    <tr key={index} className="hover:bg-gray-50 group">
                                        <td className="px-3 py-2">
                                            <input type="text" value={item.itemNo} onChange={(e) => handleItemChange(index, 'itemNo', e.target.value)} 
                                                className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-1.5 border" />
                                        </td>
                                        <td className="px-3 py-2 text-sm text-gray-500">
                                            <textarea rows={1} value={item.description} onChange={(e) => handleItemChange(index, 'description', e.target.value)}
                                                className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-1.5 border min-h-[38px]" />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input type="number" step="0.001" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-1.5 border" />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input type="text" value={item.unit} onChange={(e) => handleItemChange(index, 'unit', e.target.value)}
                                                className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-1.5 border" />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input type="number" step="0.01" value={item.rate} onChange={(e) => handleItemChange(index, 'rate', e.target.value)}
                                                className="block w-full text-sm border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 p-1.5 border" />
                                        </td>
                                        <td className="px-3 py-2">
                                            <input type="number" readOnly value={item.amount}
                                                className="block w-full text-sm border-none bg-transparent font-semibold text-gray-900 p-1.5 text-right" />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-400 hover:text-red-600 transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {formData.items.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500 italic">No items added yet. Click "Add Item" or "Fetch from PDF".</td>
                                    </tr>
                                )}
                            </tbody>
                            <tfoot className="bg-gray-50 font-bold">
                                <tr>
                                    <td colSpan={5} className="px-3 py-4 text-right text-sm font-bold text-gray-900">Total Amount:</td>
                                    <td className="px-3 py-4 text-right text-sm text-gray-900 px-4">
                                        ₹{formData.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>

            <div className="pt-5 flex justify-end gap-3">
                <Link href="/boqs" className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors">Cancel</Link>
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center px-6 py-2 border border-transparent rounded-md shadow-lg text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    {loading ? 'Saving...' : (isEditing ? 'Update BOQ' : 'Save BOQ')}
                </button>
            </div>
        </form>
    );
}
