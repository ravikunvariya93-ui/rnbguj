'use client';

import { useState, useEffect } from 'react';
import { 
    Users, Plus, Search, Edit2, Trash2, Shield, 
    Calendar, User as UserIcon, Loader2, AlertCircle 
} from 'lucide-react';
import UserForm from '@/components/UserForm';

interface ManagedUser {
    _id: string;
    name: string;
    username: string;
    role?: string;
    roles?: string[];
    officeType?: string;
    jurisdiction?: string;
    assignedSubDivision?: string;
    assignedSubDivisions?: string[];
    createdAt: string;
}

const userRolesOf = (user: ManagedUser): string[] =>
    Array.isArray(user.roles) && user.roles.length > 0 ? user.roles : (user.role ? [user.role] : []);

export default function UserManagementPage() {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [roleLabels, setRoleLabels] = useState<Record<string, string>>({});
    const [jurisdictionNames, setJurisdictionNames] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [, setError] = useState('');
    const [search, setSearch] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const [usersRes, rolesRes, jurisdictionsRes] = await Promise.all([
                fetch('/api/admin/users'),
                fetch('/api/admin/roles'),
                fetch('/api/admin/jurisdictions'),
            ]);
            if (!usersRes.ok) throw new Error('Failed to fetch users');
            const data = await usersRes.json();
            setUsers(data);
            if (rolesRes.ok) {
                const roles = await rolesRes.json();
                const map: Record<string, string> = {};
                (Array.isArray(roles) ? roles : []).forEach((r: { key: string; label: string }) => {
                    map[r.key] = r.label;
                });
                setRoleLabels(map);
            }
            if (jurisdictionsRes.ok) {
                const jurisdictions = await jurisdictionsRes.json();
                const jmap: Record<string, string> = {};
                (Array.isArray(jurisdictions) ? jurisdictions : []).forEach((j: { _id: string; name: string }) => {
                    jmap[j._id] = j.name;
                });
                setJurisdictionNames(jmap);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to fetch users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete user "${name}"?`)) return;

        try {
            const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || 'Failed to delete user');
            }
            fetchUsers();
        } catch (err: unknown) {
            alert(err instanceof Error && err.message ? err.message : 'Failed to delete user');
        }
    };

    const filteredUsers = users.filter(user => 
        user.name.toLowerCase().includes(search.toLowerCase()) ||
        user.username.toLowerCase().includes(search.toLowerCase())
    );

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'ADMIN': return 'bg-purple-100 text-purple-700 border-purple-200';
            case 'SUPERVISOR': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="h-7 w-7 text-emerald-600" />
                        User Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Manage personnel access and roles.</p>
                </div>
                <button
                    onClick={() => {
                        setSelectedUser(null);
                        setIsFormOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200"
                >
                    <Plus className="h-5 w-5" />
                    Add New User
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-50 flex items-center gap-3">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search users..."
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
                                <th className="px-6 py-4">User</th>
                                <th className="px-6 py-4">Role</th>
                                <th className="px-6 py-4">Office</th>
                                <th className="px-6 py-4">Created At</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading && users.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center">
                                        <Loader2 className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-2" />
                                        <p className="text-gray-500 text-sm">Loading users...</p>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                        No users found.
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user._id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 font-bold">
                                                    <UserIcon className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-900">{user.name}</p>
                                                    <p className="text-xs text-gray-500">@{user.username}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-wrap gap-1">
                                                {userRolesOf(user).map((rk) => (
                                                    <span key={rk} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border ${getRoleBadgeColor(rk)}`}>
                                                        <Shield className="h-3 w-3" />
                                                        {roleLabels[rk] || rk}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-semibold text-gray-800">
                                                {user.officeType === 'SUB_DIVISION' ? 'Sub Division' : 'Division'}
                                            </p>
                                            {user.jurisdiction && (
                                                <p className="text-xs text-gray-500">{jurisdictionNames[user.jurisdiction] || user.jurisdiction}</p>
                                            )}
                                            {((user.assignedSubDivisions && user.assignedSubDivisions.length > 0 ? user.assignedSubDivisions : (user.assignedSubDivision ? [user.assignedSubDivision] : [])).length > 0) && (
                                                <p className="text-xs text-amber-600 font-medium">Scope: {(user.assignedSubDivisions && user.assignedSubDivisions.length > 0 ? user.assignedSubDivisions : [user.assignedSubDivision as string]).map((v) => jurisdictionNames[v] || v).join(', ')}</p>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-gray-500 text-sm">
                                                <Calendar className="h-4 w-4" />
                                                {new Date(user.createdAt).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata' })}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => {
                                                        setSelectedUser(user);
                                                        setIsFormOpen(true);
                                                    }}
                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                    title="Edit User"
                                                >
                                                    <Edit2 className="h-5 w-5" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user._id, user.name)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Delete User"
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
                <UserForm
                    user={selectedUser ?? undefined}
                    onClose={() => setIsFormOpen(false)}
                    onSave={fetchUsers}
                />
            )}
        </div>
    );
}
