'use client';

import { useSession, signOut } from 'next-auth/react';
import { useEffect, useState } from 'react';
import { User, Shield, LogOut, Building2, Briefcase, Clock, ChevronRight, Loader2, Edit2, Check, X } from 'lucide-react';
import { ROLE_LABELS, isAuditorRole, getAuditorSubDivision } from '@/lib/roles';

interface NameHistoryEntry {
  name: string;
  designation?: string;
  changedAt: string;
  changedBy?: string;
}

interface FullProfile {
  name: string;
  username: string;
  role: string;
  designation?: string;
  nameHistory: NameHistoryEntry[];
}

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState<FullProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesignation, setEditDesignation] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then(data => {
        setProfile(data);
        setEditName(data.name || '');
        setEditDesignation(data.designation || '');
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, designation: editDesignation }),
      });
      if (!res.ok) throw new Error('Failed to save');
      const updated = await res.json();
      setProfile(updated);
      setEditing(false);
      setSaveMsg('Profile updated successfully.');
      // Refresh session so sidebar name updates
      await update();
    } catch {
      setSaveMsg('Failed to update profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-pulse text-gray-500 font-medium">Loading profile...</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  const user = session.user as any;
  const roleLabel = ROLE_LABELS[user.role] || user.role;
  const auditorSubDivision = getAuditorSubDivision(user.role);
  const roleBadgeClass =
    user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
    user.role === 'SUPERVISOR' ? 'bg-emerald-100 text-emerald-800' :
    isAuditorRole(user.role) ? 'bg-amber-100 text-amber-800' :
    'bg-gray-100 text-gray-800';

  const history: NameHistoryEntry[] = (profile?.nameHistory || []).slice().reverse();

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-8 py-10 text-white">
          <div className="flex items-center gap-6">
            <div className="h-20 w-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 shadow-xl">
              <User className="h-10 w-10 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profile?.name || user.name}</h1>
              {profile?.designation && (
                <p className="text-white/80 text-sm mt-0.5">{profile.designation}</p>
              )}
              <p className="opacity-70 flex items-center gap-2 mt-1 text-sm">
                <Shield className="h-3.5 w-3.5" />
                {roleLabel}
                {auditorSubDivision && <span className="ml-1 text-white/60">· {auditorSubDivision}</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Account Details */}
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b pb-2">
                <h2 className="text-xl font-bold text-gray-900">Account Details</h2>
                {!editing && (
                  <button
                    onClick={() => { setEditing(true); setSaveMsg(''); }}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors"
                  >
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
              </div>

              {saveMsg && (
                <p className={`text-xs font-semibold rounded-md px-3 py-2 ${saveMsg.includes('success') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                  {saveMsg}
                </p>
              )}

              {/* Name */}
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                  <User className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Full Name</p>
                  {editing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-base font-semibold text-gray-900">{profile?.name}</p>
                  )}
                </div>
              </div>

              {/* Designation */}
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                  <Briefcase className="h-5 w-5 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-500">Designation</p>
                  {editing ? (
                    <input
                      type="text"
                      value={editDesignation}
                      onChange={e => setEditDesignation(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="e.g. Junior Auditor"
                    />
                  ) : (
                    <p className="text-base font-semibold text-gray-900">{profile?.designation || <span className="text-gray-400 font-normal italic">Not set</span>}</p>
                  )}
                </div>
              </div>

              {/* Username */}
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                  <User className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Username</p>
                  <p className="text-base font-semibold text-gray-900 font-mono">{user.username}</p>
                </div>
              </div>

              {/* Role */}
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                  <Shield className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Access Level</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${roleBadgeClass}`}>
                    {roleLabel}
                  </span>
                  {auditorSubDivision && (
                    <p className="text-xs text-gray-500 mt-1">Bills restricted to: <span className="font-semibold text-amber-700">{auditorSubDivision}</span> sub-division</p>
                  )}
                </div>
              </div>

              {/* Department */}
              <div className="flex items-start gap-4">
                <div className="p-2 bg-emerald-50 rounded-lg flex-shrink-0">
                  <Building2 className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Department</p>
                  <p className="text-base font-semibold text-gray-900">Panchayat R&B Division, Bhavnagar</p>
                </div>
              </div>

              {/* Save/Cancel buttons */}
              {editing && (
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60 transition-colors"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    Save
                  </button>
                  <button
                    onClick={() => { setEditing(false); setEditName(profile?.name || ''); setEditDesignation(profile?.designation || ''); }}
                    className="flex items-center gap-1.5 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </div>
              )}
            </div>

            {/* Security + Sign Out */}
            <div className="space-y-5">
              <h2 className="text-xl font-bold text-gray-900 border-b pb-2">Login & Security</h2>
              
              <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-xl text-yellow-800 text-sm">
                <p className="font-semibold mb-1">Security Tip</p>
                Always ensure you log out of shared computers after completing your work.
              </div>

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl font-semibold transition-colors border border-red-200"
              >
                <LogOut className="h-5 w-5" />
                Sign Out of Account
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chronology of Events */}
      <div className="bg-white shadow-sm rounded-2xl border border-gray-100 p-8">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="h-5 w-5 text-emerald-600" />
          <h2 className="text-xl font-bold text-gray-900">Chronology of Events</h2>
        </div>

        {history.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Clock className="h-10 w-10 mx-auto mb-2 text-gray-200" />
            <p className="text-sm">No history yet. Changes to name or designation will be recorded here.</p>
          </div>
        ) : (
          <ol className="relative border-l-2 border-emerald-100 space-y-6 ml-4">
            {history.map((entry, idx) => (
              <li key={idx} className="relative pl-6">
                {/* Timeline dot */}
                <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white shadow" />
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-gray-800">{entry.name}</p>
                      {entry.designation && (
                        <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                          <Briefcase className="h-3 w-3" /> {entry.designation}
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {new Date(entry.changedAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </div>
                  {entry.changedBy && (
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <ChevronRight className="h-3 w-3" /> Changed by: <span className="font-mono">{entry.changedBy}</span>
                    </p>
                  )}
                </div>
              </li>
            ))}
            {/* Current state at the bottom */}
            <li className="relative pl-6">
              <span className="absolute -left-[9px] top-1 h-4 w-4 rounded-full bg-emerald-700 border-2 border-white shadow ring-2 ring-emerald-200" />
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-emerald-900">{profile?.name} <span className="text-emerald-600 font-normal text-xs ml-1">(current)</span></p>
                    {profile?.designation && (
                      <p className="text-xs text-emerald-700 mt-0.5 flex items-center gap-1">
                        <Briefcase className="h-3 w-3" /> {profile.designation}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-emerald-500 font-semibold">Now</span>
                </div>
              </div>
            </li>
          </ol>
        )}
      </div>
    </div>
  );
}
