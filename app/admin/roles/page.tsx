'use client';

import { useState, useEffect } from 'react';
import {
    Shield, Plus, Search, Edit2, Trash2, X,
    Loader2, AlertCircle, CheckSquare, Square, Lock
} from 'lucide-react';
import { MODULES } from '@/lib/access';

interface ManagedRole {
    _id: string;
    key: string;
    label: string;
    modules: string[];
    isSystem?: boolean;
}

export default function RolesPage() {
    const [roles, setRoles] = useState<ManagedRole[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editing, setEditing] = useState<ManagedRole | null>(null);
    const [formKey, setFormKey] = useState('');
    const [formLabel, setFormLabel] = useState('');
    const [formModules, setFormModules] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState('');

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/roles');
            if (!res.ok) throw new Error('Failed to fetch roles');
            setRoles(await res.json());
        } catch {
            alert('Failed to fetch roles');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const openAdd = () => {
        setEditing(null);
        setFormKey('');
        setFormLabel('');
        setFormModules([]);
        setFormError('');
        setIsFormOpen(true);
    };

    const openEdit = (role: ManagedRole) => {
        setEditing(role);
        setFormKey(role.key);
        setFormLabel(role.label);
        setFormModules(role.modules || []);
        setFormError('');
        setIsFormOpen(true);
    };

    const toggleModule = (key: string) => {
        setFormModules((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setFormError('');
        try {
            const url = editing ? `/api/admin/roles/${editing._id}` : '/api/admin/roles';
            const method = editing ? 'PUT' : 'POST';
            const body = editing
                ? { label: formLabel, modules: formModules }
                : { key: formKey, label: formLabel, modules: formModules };
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save role');
            }
            setIsFormOpen(false);
            fetchRoles();
        } catch (err: unknown) {
            setFormError(err instanceof Error ? err.message : 'Failed to save role');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (role: ManagedRole) => {
        if (!confirm(`Delete role "${role.label}" (${role.key})?`)) return;
        try {
            const res = await fetch(`/api/admin/roles/${role._id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete role');
            }
            fetchRoles();
        } catch (err: unknown) {
            alert(err instanceof Error ? err.message : 'Failed to delete role');
        }
    };

    const filtered = roles.filter((r) =>
        r.key.toLowerCase().includes(search.toLowerCase()) ||
        r.label.toLowerCase().includes(search.toLowerCase())
    );

    const moduleLabel = (key: string) => MODULES.find((m) => m.key === key)?.label || key;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Shield className="h-7 w-7 text-emerald-600" />
                        Role Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Define roles and which modules each role can open. Changes apply when users log in next.</p>
                </div>
                <button
                    onClick={openAdd}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                    <Plus className="h-5 w-5" />
                    Add New Role
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search roles..."
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
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Module Access</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading && roles.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center">
                                        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-2" />
                                        <p className="text-gray-500 text-sm">Loading roles...</p>
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-6 py-12 text-center text-gray-500">
                                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        No roles found.
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((role) => (
                                    <tr key={role._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
                                                    <Shield className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900 flex items-center gap-2">
                                                        {role.label}
                                                        {role.isSystem && (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                                                                <Lock className="h-2.5 w-2.5" /> SYSTEM
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-500 font-mono">{role.key}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1 max-w-xl">
                                                {(role.modules || []).map((m) => (
                                                    <span key={m} className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                        {moduleLabel(m)}
                                                    </span>
                                                ))}
                                                {(!role.modules || role.modules.length === 0) && (
                                                    <span className="text-xs text-gray-400 italic">No modules</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openEdit(role)}
                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title="Edit Role"
                                                >
                                                    <Edit2 className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(role)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete Role"
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <Shield className="h-5 w-5 text-emerald-600" />
                                {editing ? 'Edit Role' : 'Add New Role'}
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

                            {!editing && (
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Role Key (A–Z, 0–9, _)</label>
                                    <input
                                        type="text"
                                        required
                                        value={formKey}
                                        onChange={(e) => setFormKey(e.target.value.toUpperCase())}
                                        className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm font-mono"
                                        placeholder="e.g. SITE_ENGINEER"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Display Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formLabel}
                                    onChange={(e) => setFormLabel(e.target.value)}
                                    className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="e.g. Site Engineer"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Module Access</label>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {MODULES.map((m) => {
                                        const checked = formModules.includes(m.key);
                                        return (
                                            <button
                                                key={m.key}
                                                type="button"
                                                onClick={() => toggleModule(m.key)}
                                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-all text-left ${
                                                    checked
                                                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                                }`}
                                            >
                                                {checked ? <CheckSquare className="h-4 w-4 text-emerald-600" /> : <Square className="h-4 w-4 text-gray-300" />}
                                                {m.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

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
                                    {editing ? 'Update Role' : 'Create Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
