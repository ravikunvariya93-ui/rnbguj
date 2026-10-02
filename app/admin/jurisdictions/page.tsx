'use client';

import { useState, useEffect } from 'react';
import { MapPin, Plus, Search, Edit2, Trash2, X, Loader2, AlertCircle } from 'lucide-react';
import { OFFICE_TYPES } from '@/lib/access';

interface ManagedJurisdiction {
    _id: string;
    name: string;
    type?: string;
    matchKey?: string;
    parent?: string | null;
}

export default function JurisdictionsPage() {
    const [items, setItems] = useState<ManagedJurisdiction[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState<ManagedJurisdiction | null>(null);
    const [formName, setFormName] = useState('');
    const [formType, setFormType] = useState<string>(OFFICE_TYPES.SUB_DIVISION);
    const [formMatchKey, setFormMatchKey] = useState('');
    const [formParent, setFormParent] = useState('');
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/jurisdictions');
            if (!res.ok) throw new Error('Failed to fetch jurisdictions');
            setItems(await res.json());
        } catch {
            alert('Failed to fetch jurisdictions');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    const openAdd = () => {
        setEditing(null);
        setFormName('');
        setFormType(OFFICE_TYPES.SUB_DIVISION);
        setFormMatchKey('');
        setFormParent('');
        setFormError('');
        setIsFormOpen(true);
    };

    const openEdit = (item: ManagedJurisdiction) => {
        setEditing(item);
        setFormName(item.name);
        setFormType(item.type || OFFICE_TYPES.SUB_DIVISION);
        setFormMatchKey(item.matchKey || '');
        setFormParent(typeof item.parent === 'string' ? item.parent : '');
        setFormError('');
        setIsFormOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError('');
        try {
            const url = editing ? `/api/admin/jurisdictions/${editing._id}` : '/api/admin/jurisdictions';
            const method = editing ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: formName,
                    type: formType,
                    matchKey: formMatchKey || formName,
                    parent: formParent || null,
                }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save jurisdiction');
            }
            setIsFormOpen(false);
            fetchItems();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : 'Failed to save jurisdiction');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: ManagedJurisdiction) => {
        if (!confirm(`Delete jurisdiction "${item.name}"?`)) return;
        try {
            const res = await fetch(`/api/admin/jurisdictions/${item._id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete jurisdiction');
            }
            fetchItems();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to delete jurisdiction');
        }
    };

    const filtered = items.filter((i) => i.name.toLowerCase().includes(search.toLowerCase()));

    const parentName = (parentId?: string | null) => {
        if (!parentId) return '';
        return items.find((i) => i._id === parentId)?.name || '';
    };

    const divisionOptions = items.filter((i) => i.type === OFFICE_TYPES.DIVISION);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <MapPin className="h-7 w-7 text-emerald-600" />
                        Jurisdiction Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Divisions head their sub-divisions. Users are posted to one jurisdiction.</p>
                </div>
                <button
                    onClick={openAdd}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                    <Plus className="h-5 w-5" />
                    Add Jurisdiction
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search jurisdictions..."
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
                                <th className="px-6 py-4">Jurisdiction</th>
                                <th className="px-6 py-4">Level</th>
                                <th className="px-6 py-4">Parent Division</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading && items.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center">
                                        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-2" />
                                        <p className="text-gray-500 text-sm">Loading jurisdictions...</p>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        No jurisdictions found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((item) => (
                                    <tr key={item._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
                                                    <MapPin className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{item.name}</p>
                                                    {item.matchKey && item.matchKey !== item.name && (
                                                        <p className="text-[11px] text-gray-400 font-mono">key: {item.matchKey}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border ${item.type === OFFICE_TYPES.DIVISION ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                                                {item.type === OFFICE_TYPES.DIVISION ? 'Division' : 'Sub Division'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">{parentName(item.parent) || '—'}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(item)}
                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete"
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
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <MapPin className="h-5 w-5 text-emerald-600" />
                                {editing ? 'Edit Jurisdiction' : 'Add Jurisdiction'}
                            </h3>
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-all"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
                            {formError && (
                                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md text-sm text-red-700">
                                    {formError}
                                </div>
                            )}
                            {editing && (
                                <p className="text-xs text-slate-500 font-medium">Renaming updates all users assigned to “{editing.name}”.</p>
                            )}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="e.g. Amreli / Dhari"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Level</label>
                                <select
                                    value={formType}
                                    onChange={(e) => setFormType(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm bg-white"
                                >
                                    <option value={OFFICE_TYPES.SUB_DIVISION}>Sub Division</option>
                                    <option value={OFFICE_TYPES.DIVISION}>Division</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Match Key</label>
                                <input
                                    type="text"
                                    value={formMatchKey}
                                    onChange={(e) => setFormMatchKey(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm font-mono"
                                    placeholder="Defaults to the name — must equal the sub-division value in records"
                                />
                                <p className="text-[11px] text-gray-400 mt-1">Used to match data records. Keep stable.</p>
                            </div>
                            {formType === OFFICE_TYPES.SUB_DIVISION && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Parent Division</label>
                                    <select
                                        value={formParent}
                                        onChange={(e) => setFormParent(e.target.value)}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm bg-white"
                                    >
                                        <option value="">None</option>
                                        {divisionOptions
                                            .filter((d) => !editing || d._id !== editing._id)
                                            .map((d) => (
                                                <option key={d._id} value={d._id}>{d.name}</option>
                                            ))}
                                    </select>
                                </div>
                            )}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsFormOpen(false)}
                                    className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 py-2.5 px-4 text-white font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-all disabled:opacity-70 text-sm flex items-center justify-center gap-2"
                                >
                                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {editing ? 'Save' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
