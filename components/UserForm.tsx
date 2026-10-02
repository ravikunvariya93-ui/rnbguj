'use client';

import { useState, useEffect } from 'react';
import { X, User, Lock, Loader2, Building2, MapPin } from 'lucide-react';
import { OFFICE_TYPES, OFFICE_TYPE_LABELS, SCOPED_ROLE_KEYS } from '@/lib/access';

interface FormUser {
    _id?: string;
    name?: string;
    username?: string;
    role?: string;
    roles?: string[];
    officeType?: string;
    jurisdiction?: string;
    assignedSubDivision?: string;
    assignedSubDivisions?: string[];
}

interface RoleOption {
    key: string;
    label: string;
}

interface JurisdictionOption {
    _id: string;
    name: string;
    type?: string;
    parent?: string | null;
}

interface UserFormProps {
    user?: FormUser;
    onClose: () => void;
    onSave: () => void;
}

export default function UserForm({ user, onClose, onSave }: UserFormProps) {
    const [formData, setFormData] = useState<{
        name: string;
        username: string;
        password: string;
        roles: string[];
        officeType: string;
        jurisdiction: string;
        assignedSubDivisions: string[];
    }>({
        name: '',
        username: '',
        password: '',
        roles: [],
        officeType: OFFICE_TYPES.DIVISION,
        jurisdiction: '',
        assignedSubDivisions: [],
    });
    const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);
    const [jurisdictionOptions, setJurisdictionOptions] = useState<JurisdictionOption[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        fetch('/api/admin/roles')
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setRoleOptions(Array.isArray(data) ? data : []))
            .catch(() => setRoleOptions([]));
        fetch('/api/admin/jurisdictions')
            .then((r) => (r.ok ? r.json() : []))
            .then((data) => setJurisdictionOptions(Array.isArray(data) ? data : []))
            .catch(() => setJurisdictionOptions([]));
    }, []);

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                username: user.username || '',
                password: '', // Don't pre-fill password for editing
                roles: Array.isArray(user.roles) && user.roles.length > 0
                    ? user.roles
                    : (user.role ? [user.role] : []),
                officeType: user.officeType || OFFICE_TYPES.DIVISION,
                jurisdiction: user.jurisdiction || '',
                assignedSubDivisions: Array.isArray((user as FormUser & { assignedSubDivisions?: string[] }).assignedSubDivisions)
                    ? ((user as FormUser & { assignedSubDivisions?: string[] }).assignedSubDivisions as string[])
                    : (((user as FormUser & { assignedSubDivision?: string }).assignedSubDivision
                        ? [(user as FormUser & { assignedSubDivision?: string }).assignedSubDivision as string] : [])),
            });
        }
    }, [user]);

    // One-time upgrade: older users store the jurisdiction NAME — map it to the doc id once options arrive.
    useEffect(() => {
        if (jurisdictionOptions.length === 0) return;
        const patch: { jurisdiction?: string; assignedSubDivisions?: string[] } = {};
        if (formData.jurisdiction && !/^[0-9a-fA-F]{24}$/.test(formData.jurisdiction)) {
            const match = jurisdictionOptions.find((j) => j.name === formData.jurisdiction);
            if (match) patch.jurisdiction = match._id;
        }
        const legacyAssigned = formData.assignedSubDivisions.filter((v) => !/^[0-9a-fA-F]{24}$/.test(v));
        if (legacyAssigned.length > 0) {
            const mapped = formData.assignedSubDivisions.map((v) => {
                if (/^[0-9a-fA-F]{24}$/.test(v)) return v;
                return jurisdictionOptions.find((j) => j.name === v)?._id || '';
            }).filter(Boolean);
            patch.assignedSubDivisions = [...new Set(mapped)];
        }
        if (patch.jurisdiction || patch.assignedSubDivisions) {
            setFormData((prev) => ({ ...prev, ...patch }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jurisdictionOptions]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const url = user ? `/api/admin/users/${user._id}` : '/api/admin/users';
        const method = user ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to save user');
            }

            onSave();
            onClose();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save user');
            setLoading(false);
        }
    };

    const hasScopedRole = formData.roles.some((k) => SCOPED_ROLE_KEYS.includes(k));

    const needsSubDivision =
        formData.officeType === OFFICE_TYPES.SUB_DIVISION || hasScopedRole;

    // Auditors sit in the Division office but may be posted to a Division
    // (whole-division scope) or a Sub Division — so offer both levels.
    const showAllJurisdictions =
        formData.officeType === OFFICE_TYPES.DIVISION && hasScopedRole;

    // Multi-charge (e.g. DEE of Palitana + Mahuva): Sub Division-office
    // users can hold additional Sub Division postings, and any
    // Division-office user can be scoped to specific Sub Divisions.
    const showChargeMulti =
        formData.officeType === OFFICE_TYPES.SUB_DIVISION ||
        (formData.officeType === OFFICE_TYPES.DIVISION && !hasScopedRole);

    const toggleRole = (key: string) => {
        setFormData((prev) => {
            const next = prev.roles.includes(key)
                ? prev.roles.filter((k) => k !== key)
                : [...prev.roles, key];
            return { ...prev, roles: next };
        });
    };

    const toggleAssignedSub = (id: string) => {
        setFormData((prev) => ({
            ...prev,
            assignedSubDivisions: prev.assignedSubDivisions.includes(id)
                ? prev.assignedSubDivisions.filter((v) => v !== id)
                : [...prev.assignedSubDivisions, id],
        }));
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                        <User className="h-5 w-5 text-emerald-600" />
                        {user ? 'Edit User' : 'Add New User'}
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
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="e.g. Ramesh Kumar Patel"
                                />
                            </div>
                        </div>

                        {/* Username */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Username</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <User className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="Enter username"
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                {user ? 'Password (leave blank to keep current)' : 'Password'}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    required={!user}
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        {/* Office Type */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Office Type</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Building2 className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    value={formData.officeType}
                                    onChange={(e) => setFormData({ ...formData, officeType: e.target.value, jurisdiction: '', assignedSubDivisions: [] })}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm bg-white"
                                >
                                    <option value={OFFICE_TYPES.DIVISION}>{OFFICE_TYPE_LABELS[OFFICE_TYPES.DIVISION]}</option>
                                    <option value={OFFICE_TYPES.SUB_DIVISION}>{OFFICE_TYPE_LABELS[OFFICE_TYPES.SUB_DIVISION]}</option>
                                </select>
                            </div>
                        </div>

                        {/* Division / Sub Division */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                {showAllJurisdictions ? 'Division (office)' : (needsSubDivision ? 'Sub Division' : 'Division')}
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <MapPin className="h-4 w-4 text-gray-400" />
                                </div>
                                <select
                                    value={formData.jurisdiction}
                                    onChange={(e) => setFormData({ ...formData, jurisdiction: e.target.value, assignedSubDivisions: [] })}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all sm:text-sm bg-white"
                                >
                                    <option value="">Select…</option>
                                    {jurisdictionOptions
                                        .filter((j) => (showAllJurisdictions ? j.type === OFFICE_TYPES.DIVISION : (needsSubDivision ? j.type !== OFFICE_TYPES.DIVISION : j.type === OFFICE_TYPES.DIVISION)))
                                        .map((j) => (
                                            <option key={j._id} value={j._id}>{j.name}</option>
                                        ))}
                                </select>
                            </div>
                        </div>

                        {/* Bills-passing Sub Divisions (Auditor in Division office) */}
                        {showAllJurisdictions && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    Sub Divisions (bills passed)
                                </label>
                                <div className="space-y-1.5 max-h-44 overflow-y-auto border border-gray-300 rounded-lg p-2.5 bg-white">
                                    {jurisdictionOptions
                                        .filter((j) => j.type !== OFFICE_TYPES.DIVISION && (!formData.jurisdiction || String(j.parent || '') === formData.jurisdiction))
                                        .map((j) => {
                                            const checked = formData.assignedSubDivisions.includes(j._id);
                                            return (
                                                <label key={j._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleAssignedSub(j._id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">{j.name}</span>
                                                </label>
                                            );
                                        })}
                                </div>
                                {formData.assignedSubDivisions.length === 0 && (
                                    <p className="text-xs text-red-500 mt-1">Select at least one sub division.</p>
                                )}
                            </div>
                        )}

                        {/* Multi-charge Sub Divisions (e.g. DEE of Palitana + Mahuva) */}
                        {showChargeMulti && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">
                                    {formData.officeType === OFFICE_TYPES.SUB_DIVISION
                                        ? 'Sub Division postings (select all held charges)'
                                        : 'Sub Divisions (additional charge — leave empty for whole division)'}
                                </label>
                                <div className="space-y-1.5 max-h-44 overflow-y-auto border border-gray-300 rounded-lg p-2.5 bg-white">
                                    {jurisdictionOptions
                                        .filter((j) => j.type !== OFFICE_TYPES.DIVISION && (formData.officeType === OFFICE_TYPES.SUB_DIVISION || !formData.jurisdiction || String(j.parent || '') === formData.jurisdiction))
                                        .map((j) => {
                                            const checked = formData.assignedSubDivisions.includes(j._id);
                                            return (
                                                <label key={j._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={() => toggleAssignedSub(j._id)}
                                                        className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                                    />
                                                    <span className="text-sm font-medium text-gray-700">{j.name}</span>
                                                </label>
                                            );
                                        })}
                                </div>
                                <p className="text-xs text-gray-500 mt-1">Select multiple sub divisions for multi-charge posting.</p>
                            </div>
                        )}

                        {/* Roles (first selected shows as primary) */}
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Roles</label>
                            <div className="space-y-1.5 max-h-44 overflow-y-auto border border-gray-300 rounded-lg p-2.5 bg-white">
                                {roleOptions.length === 0 && (
                                    <p className="text-xs text-gray-400">Loading roles…</p>
                                )}
                                {roleOptions.map((r) => {
                                    const checked = formData.roles.includes(r.key);
                                    return (
                                        <label key={r.key} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                            <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={() => toggleRole(r.key)}
                                                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">
                                                {r.label}
                                                {checked && formData.roles[0] === r.key && (
                                                    <span className="ml-1.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1">PRIMARY</span>
                                                )}
                                            </span>
                                        </label>
                                    );
                                })}
                            </div>
                            {formData.roles.length === 0 && (
                                <p className="text-xs text-red-500 mt-1">Select at least one role.</p>
                            )}
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
                            {user ? 'Update User' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

