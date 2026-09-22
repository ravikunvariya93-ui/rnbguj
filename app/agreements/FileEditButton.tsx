'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Edit2, X } from 'lucide-react';
import { formatDateForInput, parseDateStr } from '@/lib/dateUtils';

interface FileEditButtonProps {
    id: string;
    agreementNo?: string;
    agreementYear?: string;
    packageName?: string;
    fileSentOnDateISO?: string | null;
    potakaNo?: string;
}

export default function FileEditButton({
    id,
    agreementNo,
    agreementYear,
    packageName,
    fileSentOnDateISO,
    potakaNo: initialPotakaNo,
}: FileEditButtonProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [fileSentOnDate, setFileSentOnDate] = useState(() => formatDateForInput(fileSentOnDateISO ?? ''));
    const [potakaNo, setPotakaNo] = useState(initialPotakaNo || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const openModal = () => {
        setFileSentOnDate(formatDateForInput(fileSentOnDateISO ?? ''));
        setPotakaNo(initialPotakaNo || '');
        setError('');
        setOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        let fileSentOnDateISOValue: string | null = null;
        const trimmedDate = fileSentOnDate.trim();
        if (trimmedDate) {
            const parsed = parseDateStr(trimmedDate);
            if (!parsed) {
                setError('File Sent On Date must be DD/MM/YYYY.');
                return;
            }
            fileSentOnDateISOValue = parsed.toISOString();
        }
        setSaving(true);
        try {
            const res = await fetch(`/api/work-orders/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileSentOnDate: fileSentOnDateISOValue,
                    potakaNo: potakaNo.trim(),
                }),
            });
            if (!res.ok) throw new Error('Failed to save file details.');
            setOpen(false);
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error && err.message ? err.message : 'Failed to save file details.');
        } finally {
            setSaving(false);
        }
    };

    const title = [agreementYear, agreementNo].filter(Boolean).join('/');

    return (
        <>
            <button
                type="button"
                onClick={openModal}
                title="Add / edit File Sent On Date and Potaka No."
                className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded-lg border border-emerald-200 transition-all cursor-pointer"
            >
                <Edit2 className="w-3 h-3" /> File
            </button>
            {open && createPortal(
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 overflow-y-auto" onClick={() => !saving && setOpen(false)}>
                    <div
                        className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden my-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-slate-800">File Details{title ? ` — ${title}` : ''}</h3>
                                {packageName && <p className="text-xs text-slate-500 mt-0.5">{packageName}</p>}
                            </div>
                            <button
                                type="button"
                                onClick={() => !saving && setOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                                title="Close"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="px-5 py-4 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">File Sent On Date</label>
                                <input
                                    type="text"
                                    placeholder="DD/MM/YYYY"
                                    value={fileSentOnDate}
                                    onChange={(e) => setFileSentOnDate(e.target.value)}
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1">Potaka No.</label>
                                <input
                                    type="text"
                                    placeholder="Potaka No."
                                    value={potakaNo}
                                    onChange={(e) => setPotakaNo(e.target.value)}
                                    className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                            {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
                            <div className="flex justify-end gap-2 pt-1">
                                <button
                                    type="button"
                                    onClick={() => setOpen(false)}
                                    disabled={saving}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold disabled:opacity-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                                >
                                    {saving ? 'Saving...' : 'Save'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}
