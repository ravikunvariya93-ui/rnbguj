'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Camera, Loader2, MapPin, Plus, Trash2, X } from 'lucide-react';
import { formatDateForInput, formatShortDate, parseDateStr } from '@/lib/dateUtils';
import { PROGRESS_DELETE_ROLES, PROGRESS_WRITE_ROLES, ROLE_LABELS } from '@/lib/roles';

interface ProgressPhoto {
    url: string;
    fileName: string;
    lat?: number;
    lng?: number;
    takenAt?: string;
}

interface ProgressEntry {
    _id: string;
    workName: string;
    date: string;
    physicalPercent: number;
    chainageFrom?: string;
    chainageTo?: string;
    remarks?: string;
    authorName: string;
    authorRole?: string;
    photos: ProgressPhoto[];
}

interface StagedPhoto {
    file: File;
    preview: string;
    lat?: number;
    lng?: number;
}

interface ProgressSectionProps {
    packageId: string;
    works: string[];
    stipulatedCompletionDate?: string | Date | null;
    actualCompletionDate?: string | Date | null;
}

const viewUrl = (url?: string) =>
    url && url.startsWith('http') ? `/api/blob?url=${encodeURIComponent(url)}` : url || '#';

const DAY_MS = 24 * 60 * 60 * 1000;

export function calcDelayDays(stipulated?: string | Date | null, actual?: string | Date | null): number | null {
    if (!stipulated) return null;
    const stip = new Date(stipulated);
    if (isNaN(stip.getTime())) return null;
    const end = actual ? new Date(actual) : new Date();
    if (actual && isNaN(end.getTime())) return null;
    return Math.max(0, Math.floor((end.getTime() - stip.getTime()) / DAY_MS));
}

export default function ProgressSection({ packageId, works, stipulatedCompletionDate, actualCompletionDate }: ProgressSectionProps) {
    const { data: session } = useSession();
    const sessionUser = session?.user as { role?: string; name?: string } | undefined;
    const role = sessionUser?.role;
    const userName = sessionUser?.name;
    const canWrite = !!role && PROGRESS_WRITE_ROLES.includes(role);
    const canDelete = !!role && PROGRESS_DELETE_ROLES.includes(role);

    const [entries, setEntries] = useState<ProgressEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formError, setFormError] = useState('');
    const [selectedWork, setSelectedWork] = useState<string>('__all');
    const [lightbox, setLightbox] = useState<string | null>(null);

    // Form state
    const [fWork, setFWork] = useState(works[0] || '');
    const [fDate, setFDate] = useState(() => formatDateForInput(new Date()) || '');
    const [fPercent, setFPercent] = useState('');
    const [fChFrom, setFChFrom] = useState('');
    const [fChTo, setFChTo] = useState('');
    const [fRemarks, setFRemarks] = useState('');
    const [fAuthor, setFAuthor] = useState('');
    const [fRole, setFRole] = useState('');
    const [staged, setStaged] = useState<StagedPhoto[]>([]);
    const [gpsState, setGpsState] = useState<'idle' | 'waiting' | 'ok' | 'denied'>('idle');
    const [gps, setGps] = useState<{ lat: number; lng: number } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const fetchEntries = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/progress?packageId=${packageId}&limit=1000`, {
                headers: { Accept: 'application/json' },
            });
            const body = await res.json().catch(() => null);
            if (res.ok && body?.success) setEntries(body.data || []);
        } catch {
            // keep previous entries
        } finally {
            setLoading(false);
        }
    }, [packageId]);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    useEffect(() => {
        if (showForm && !fAuthor && userName) setFAuthor(userName);
        if (showForm && !fRole && role) setFRole(role);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showForm]);

    const delayDays = useMemo(
        () => calcDelayDays(stipulatedCompletionDate, actualCompletionDate),
        [stipulatedCompletionDate, actualCompletionDate]
    );

    // Latest % per work + timeline grouping
    const workStats = useMemo(() => {
        const map = new Map<string, { latest: number; count: number; lastDate: string }>();
        for (const e of entries) {
            const cur = map.get(e.workName);
            if (!cur) {
                map.set(e.workName, { latest: e.physicalPercent, count: 1, lastDate: e.date });
            } else {
                cur.count += 1;
                if (new Date(e.date).getTime() > new Date(cur.lastDate).getTime()) {
                    cur.latest = e.physicalPercent;
                    cur.lastDate = e.date;
                }
            }
        }
        return map;
    }, [entries]);

    const visibleEntries = useMemo(
        () => (selectedWork === '__all' ? entries : entries.filter((e) => e.workName === selectedWork)),
        [entries, selectedWork]
    );

    const captureGps = () => {
        if (!('geolocation' in navigator)) {
            setGpsState('denied');
            return;
        }
        setGpsState('waiting');
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setGpsState('ok');
            },
            () => setGpsState('denied'),
            { enableHighAccuracy: true, timeout: 15000 }
        );
    };

    const handleFiles = (files: FileList | null) => {
        if (!files) return;
        const imgs = Array.from(files).filter((f) => f.type.startsWith('image/'));
        if (imgs.length === 0) return;
        setStaged((prev) => [...prev, ...imgs.map((file) => ({ file, preview: URL.createObjectURL(file) }))].slice(0, 20));
        if (gpsState === 'idle') captureGps();
    };

    const uploadStaged = async (): Promise<ProgressPhoto[]> => {
        const out: ProgressPhoto[] = [];
        for (const s of staged) {
            const fd = new FormData();
            fd.append('file', s.file);
            fd.append('folder', 'progress');
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.success) throw new Error(body?.error || 'Photo upload failed');
            out.push({
                url: body.fileUrl,
                fileName: body.fileName || s.file.name,
                lat: gps?.lat,
                lng: gps?.lng,
                takenAt: new Date().toISOString(),
            });
        }
        return out;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        const percent = Number(fPercent);
        if (!fWork) return setFormError('Select a work');
        const parsed = parseDateStr(fDate);
        if (!parsed) return setFormError('Enter a valid date (DD/MM/YYYY)');
        if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
            return setFormError('Progress must be 0–100%');
        }
        if (!fAuthor.trim()) return setFormError('Author name is required');
        setSaving(true);
        try {
            setUploading(staged.length > 0);
            const photos = await uploadStaged();
            setUploading(false);
            const res = await fetch('/api/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    packageId,
                    workName: fWork,
                    date: parsed.toISOString(),
                    physicalPercent: percent,
                    chainageFrom: fChFrom,
                    chainageTo: fChTo,
                    remarks: fRemarks,
                    authorName: fAuthor.trim(),
                    authorRole: fRole,
                    photos,
                }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.success) throw new Error(body?.error || 'Failed to save entry');
            // reset + refresh
            setStaged([]);
            setFPercent('');
            setFChFrom('');
            setFChTo('');
            setFRemarks('');
            setGps(null);
            setGpsState('idle');
            setShowForm(false);
            fetchEntries();
        } catch (err: unknown) {
            setFormError(err instanceof Error && err.message ? err.message : 'Failed to save entry');
        } finally {
            setSaving(false);
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this progress entry? Photos stay in storage.')) return;
        try {
            const res = await fetch(`/api/progress/${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            setEntries((prev) => prev.filter((e) => e._id !== id));
        } catch {
            alert('Could not delete entry');
        }
    };

    return (
        <div className="space-y-4">
            {/* Status strip: delay badge + per-work progress */}
            <div className="flex flex-wrap items-center gap-2">
                {delayDays != null &&
                    (delayDays > 0 ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            Delayed by {delayDays} day{delayDays === 1 ? '' : 's'}
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            On track
                        </span>
                    ))}
                {works.map((w) => {
                    const st = workStats.get(w);
                    return (
                        <span
                            key={w}
                            className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200"
                            title={st ? `Last visit ${formatShortDate(st.lastDate)}` : 'No entries yet'}
                        >
                            <span className="max-w-56 truncate">{w}</span>
                            <span className="font-bold text-slate-900">{st ? `${st.latest}%` : '—'}</span>
                            <span className="inline-block w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden align-middle">
                                <span
                                    className="block h-full bg-emerald-500 rounded-full"
                                    style={{ width: `${st ? Math.min(100, st.latest) : 0}%` }}
                                />
                            </span>
                        </span>
                    );
                })}
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2">
                <select
                    value={selectedWork}
                    onChange={(e) => setSelectedWork(e.target.value)}
                    className="text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="__all">All works ({entries.length})</option>
                    {works.map((w) => (
                        <option key={w} value={w}>
                            {w}
                        </option>
                    ))}
                </select>
                {canWrite && (
                    <button
                        type="button"
                        onClick={() => setShowForm((v) => !v)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                        <Plus className="w-3.5 h-3.5" /> {showForm ? 'Close entry form' : 'Add site entry'}
                    </button>
                )}
            </div>

            {/* Entry form */}
            {canWrite && showForm && (
                <form onSubmit={handleSubmit} className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Work *</label>
                            <select
                                value={fWork}
                                onChange={(e) => setFWork(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm bg-white"
                            >
                                {works.map((w) => (
                                    <option key={w} value={w}>
                                        {w}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Visit date *</label>
                            <input
                                type="text"
                                value={fDate}
                                onChange={(e) => setFDate(e.target.value)}
                                onBlur={() => {
                                    if (fDate) {
                                        const f = formatDateForInput(fDate.trim());
                                        if (f) setFDate(f);
                                    }
                                }}
                                placeholder="DD/MM/YYYY"
                                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-mono"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Physical progress % *</label>
                            <input
                                type="number"
                                min={0}
                                max={100}
                                step="any"
                                value={fPercent}
                                onChange={(e) => setFPercent(e.target.value)}
                                placeholder="e.g. 45"
                                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-mono"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Chainage from</label>
                                <input
                                    type="text"
                                    value={fChFrom}
                                    onChange={(e) => setFChFrom(e.target.value)}
                                    placeholder="0/000"
                                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-mono"
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Chainage to</label>
                                <input
                                    type="text"
                                    value={fChTo}
                                    onChange={(e) => setFChTo(e.target.value)}
                                    placeholder="1/200"
                                    className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm font-mono"
                                />
                            </div>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Remarks</label>
                        <textarea
                            value={fRemarks}
                            onChange={(e) => setFRemarks(e.target.value)}
                            rows={2}
                            placeholder="Site condition, instructions, issues…"
                            className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Officer name *</label>
                            <input
                                type="text"
                                value={fAuthor}
                                onChange={(e) => setFAuthor(e.target.value)}
                                placeholder="Officer name"
                                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Designation</label>
                            <select
                                value={fRole}
                                onChange={(e) => setFRole(e.target.value)}
                                className="w-full rounded-lg border border-slate-300 px-2 py-2 text-sm bg-white"
                            >
                                <option value="">— Select —</option>
                                <option value="AAE">{ROLE_LABELS.AAE}</option>
                                <option value="DEE">{ROLE_LABELS.DEE}</option>
                                <option value="SUPERVISOR">{ROLE_LABELS.SUPERVISOR}</option>
                                <option value="ADMIN">{ROLE_LABELS.ADMIN}</option>
                                <option value="TENDERCLERK">{ROLE_LABELS.TENDERCLERK}</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                            Site photos
                            <span className="ml-2 normal-case font-medium text-slate-500">
                                {gpsState === 'ok' && gps
                                    ? `GPS attached (${gps.lat.toFixed(5)}, ${gps.lng.toFixed(5)})`
                                    : gpsState === 'waiting'
                                      ? 'Capturing GPS…'
                                      : gpsState === 'denied'
                                        ? 'GPS unavailable — photos saved without location'
                                        : 'GPS will be captured on photo select'}
                            </span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {staged.map((s, i) => (
                                <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-300">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={s.preview} alt="" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setStaged((prev) => prev.filter((_, j) => j !== i))}
                                        className="absolute top-0.5 right-0.5 bg-slate-900/70 text-white rounded-full p-0.5 cursor-pointer"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => fileRef.current?.click()}
                                className="w-20 h-20 rounded-lg border-2 border-dashed border-slate-300 flex flex-col items-center justify-center text-slate-400 hover:border-emerald-400 hover:text-emerald-600 cursor-pointer"
                            >
                                <Camera className="w-5 h-5" />
                                <span className="text-[10px] font-bold mt-0.5">Add</span>
                            </button>
                        </div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            multiple
                            className="hidden"
                            onChange={(e) => {
                                handleFiles(e.target.files);
                                e.target.value = '';
                            }}
                        />
                    </div>
                    {formError && <p className="text-xs font-bold text-rose-600">{formError}</p>}
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold cursor-pointer"
                        >
                            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                            {uploading ? 'Uploading photos…' : saving ? 'Saving…' : 'Save entry'}
                        </button>
                    </div>
                </form>
            )}

            {/* Timeline */}
            {loading ? (
                <p className="text-sm text-slate-400 italic text-center py-6">Loading progress…</p>
            ) : visibleEntries.length === 0 ? (
                <p className="text-sm text-slate-400 italic text-center py-6">
                    No site entries yet{canWrite ? ' — add the first visit above.' : '.'}
                </p>
            ) : (
                <ol className="relative border-l-2 border-emerald-200 ml-2 space-y-4">
                    {visibleEntries.map((e) => (
                        <li key={e._id} className="ml-4">
                            <span className="absolute -left-[7px] mt-1 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-xs">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-xs font-bold text-slate-800">{formatShortDate(e.date)}</span>
                                    <span className="inline-block px-2 py-px rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                                        {e.physicalPercent}%
                                    </span>
                                    {(e.chainageFrom || e.chainageTo) && (
                                        <span className="text-[11px] font-mono text-slate-500">
                                            Ch. {e.chainageFrom || '?'} → {e.chainageTo || '?'}
                                        </span>
                                    )}
                                    <span className="text-[11px] text-slate-500 ml-auto">
                                        {e.authorName}
                                        {e.authorRole ? ` (${ROLE_LABELS[e.authorRole] || e.authorRole})` : ''}
                                    </span>
                                    {canDelete && (
                                        <button
                                            type="button"
                                            onClick={() => handleDelete(e._id)}
                                            className="text-slate-300 hover:text-rose-600 cursor-pointer"
                                            title="Delete entry"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                                <p className="mt-0.5 text-[11px] font-semibold text-slate-500 break-words">{e.workName}</p>
                                {e.remarks && <p className="mt-1 text-xs text-slate-700 whitespace-pre-wrap">{e.remarks}</p>}
                                {e.photos.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                        {e.photos.map((p, i) => (
                                            <button
                                                key={i}
                                                type="button"
                                                onClick={() => setLightbox(viewUrl(p.url))}
                                                className="relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200 cursor-pointer group"
                                                title={p.fileName}
                                            >
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={viewUrl(p.url)} alt="" className="w-full h-full object-cover" loading="lazy" />
                                                {p.lat != null && p.lng != null && (
                                                    <span className="absolute bottom-0.5 left-0.5 bg-slate-900/70 text-white rounded px-1 py-px text-[9px] font-mono flex items-center gap-0.5">
                                                        <MapPin className="w-2.5 h-2.5" />
                                                        GPS
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </li>
                    ))}
                </ol>
            )}

            {/* Lightbox */}
            {lightbox && (
                <div
                    className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/80 p-4"
                    onClick={() => setLightbox(null)}
                >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={lightbox} alt="" className="max-h-full max-w-full rounded-xl shadow-2xl" />
                </div>
            )}
        </div>
    );
}
