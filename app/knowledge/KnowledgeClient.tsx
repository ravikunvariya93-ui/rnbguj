'use client';

import { useMemo, useState } from 'react';
import {
    GraduationCap, Plus, Search, Upload, Loader2, X, Check, FileText, Eye,
    Edit2, Trash2, Play, Youtube, AlertCircle, BookOpen, Download, Link2
} from 'lucide-react';
import { youtubeEmbedUrl, youtubeThumbnailUrl, youtubeVideoId } from '@/lib/youtube';

export interface KnowledgeItem {
    _id: string;
    title: string;
    description?: string;
    kind: 'document' | 'video';
    category?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    videoUrl?: string;
    tags?: string[];
    createdBy: string;
    createdByName?: string;
    createdAt: string;
}

interface Props {
    initialItems: KnowledgeItem[];
    currentUserId: string;
    isAdmin: boolean;
}

const DOC_CATEGORIES = ['Drawing', 'GR', 'Circular', 'Document', 'Other'] as const;

const CATEGORY_STYLES: Record<string, string> = {
    Drawing: 'bg-blue-100 text-blue-800 border-blue-200',
    GR: 'bg-purple-100 text-purple-800 border-purple-200',
    Circular: 'bg-amber-100 text-amber-800 border-amber-200',
    Document: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Other: 'bg-slate-100 text-slate-700 border-slate-200',
    Video: 'bg-rose-100 text-rose-800 border-rose-200',
};

const blobViewUrl = (url?: string) =>
    url && url.startsWith('http') ? `/api/blob?url=${encodeURIComponent(url)}` : url || '#';

function formatBytes(bytes?: number): string {
    if (!bytes || bytes <= 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value?: string): string {
    if (!value) return '';
    const d = new Date(value);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function fileExtension(name?: string): string {
    const ext = (name || '').split('.').pop() || '';
    return ext.toLowerCase();
}

function fileIconStyle(name?: string): { bg: string; text: string; label: string } {
    const ext = fileExtension(name);
    if (ext === 'pdf') return { bg: 'bg-rose-100', text: 'text-rose-700', label: 'PDF' };
    if (ext === 'doc' || ext === 'docx') return { bg: 'bg-blue-100', text: 'text-blue-700', label: ext.toUpperCase() };
    if (ext === 'jpg' || ext === 'jpeg' || ext === 'png') return { bg: 'bg-violet-100', text: 'text-violet-700', label: ext.toUpperCase() };
    return { bg: 'bg-slate-100', text: 'text-slate-600', label: ext ? ext.toUpperCase() : 'FILE' };
}

interface FormState {
    title: string;
    description: string;
    kind: 'document' | 'video';
    category: string;
    tags: string;
    fileUrl: string;
    fileName: string;
    fileSize: number;
    videoUrl: string;
}

const emptyForm = (): FormState => ({
    title: '',
    description: '',
    kind: 'document',
    category: 'Document',
    tags: '',
    fileUrl: '',
    fileName: '',
    fileSize: 0,
    videoUrl: '',
});

export default function KnowledgeClient({ initialItems, currentUserId, isAdmin }: Props) {
    const [items, setItems] = useState<KnowledgeItem[]>(initialItems);
    const [search, setSearch] = useState('');
    const [kindFilter, setKindFilter] = useState<'all' | 'document' | 'video'>('all');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editing, setEditing] = useState<KnowledgeItem | null>(null);
    const [form, setForm] = useState<FormState>(emptyForm);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [formError, setFormError] = useState('');
    const [playing, setPlaying] = useState<KnowledgeItem | null>(null);

    const canManage = (item: KnowledgeItem) => isAdmin || item.createdBy === currentUserId;

    const counts = useMemo(() => ({
        all: items.length,
        document: items.filter((i) => i.kind === 'document').length,
        video: items.filter((i) => i.kind === 'video').length,
    }), [items]);

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return items.filter((item) => {
            if (kindFilter !== 'all' && item.kind !== kindFilter) return false;
            if (categoryFilter !== 'ALL' && (item.kind === 'video' ? 'Video' : item.category) !== categoryFilter) return false;
            if (!q) return true;
            const haystack = [
                item.title,
                item.description,
                item.createdByName,
                ...(item.tags || []),
            ].join(' ').toLowerCase();
            return haystack.includes(q);
        });
    }, [items, search, kindFilter, categoryFilter]);

    const openAdd = () => {
        setEditing(null);
        setForm(emptyForm());
        setFormError('');
        setIsModalOpen(true);
    };

    const openEdit = (item: KnowledgeItem) => {
        setEditing(item);
        setForm({
            title: item.title || '',
            description: item.description || '',
            kind: item.kind,
            category: item.category || 'Document',
            tags: (item.tags || []).join(', '),
            fileUrl: item.fileUrl || '',
            fileName: item.fileName || '',
            fileSize: item.fileSize || 0,
            videoUrl: item.videoUrl || '',
        });
        setFormError('');
        setIsModalOpen(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setFormError('');
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'knowledge');

            const res = await fetch('/api/upload', { method: 'POST', body: formData });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to upload file');
            }

            setForm((prev) => ({
                ...prev,
                fileUrl: data.fileUrl,
                fileName: data.fileName,
                fileSize: data.fileSize,
                title: prev.title || String(data.fileName || '').replace(/\.[^.]+$/, ''),
            }));
        } catch (err: unknown) {
            setFormError(err instanceof Error && err.message ? err.message : 'Error uploading file');
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');

        if (!form.title.trim()) {
            setFormError('Please enter a title.');
            return;
        }
        if (form.kind === 'video' && !youtubeVideoId(form.videoUrl)) {
            setFormError('Please enter a valid YouTube video link.');
            return;
        }
        if (form.kind === 'document' && !form.fileUrl) {
            setFormError('Please upload a document.');
            return;
        }

        setSaving(true);
        try {
            const url = editing ? `/api/knowledge/${editing._id}` : '/api/knowledge';
            const res = await fetch(url, {
                method: editing ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: form.title,
                    description: form.description,
                    category: form.category,
                    tags: form.tags,
                    videoUrl: form.kind === 'video' ? form.videoUrl : '',
                    fileUrl: form.kind === 'document' ? form.fileUrl : '',
                    fileName: form.kind === 'document' ? form.fileName : '',
                    fileSize: form.kind === 'document' ? form.fileSize : 0,
                }),
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to save');
            }

            const saved = data.data as KnowledgeItem;
            setItems((prev) => editing
                ? prev.map((i) => (i._id === saved._id ? saved : i))
                : [saved, ...prev]);
            setIsModalOpen(false);
        } catch (err: unknown) {
            setFormError(err instanceof Error && err.message ? err.message : 'Error saving');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (item: KnowledgeItem) => {
        if (!confirm(`Delete "${item.title}" from the Knowledge Center?`)) return;
        setDeletingId(item._id);
        try {
            const res = await fetch(`/api/knowledge/${item._id}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.error || 'Failed to delete');
            }
            setItems((prev) => prev.filter((i) => i._id !== item._id));
        } catch (err: unknown) {
            alert(err instanceof Error && err.message ? err.message : 'Error deleting');
        } finally {
            setDeletingId(null);
        }
    };

    const embedUrl = playing ? youtubeEmbedUrl(playing.videoUrl) : null;
    const previewThumb = form.kind === 'video' ? youtubeThumbnailUrl(form.videoUrl) : null;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-emerald-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                            <GraduationCap className="w-5 h-5" />
                        </span>
                        <h1 className="text-xl font-bold text-slate-800">Knowledge Center</h1>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                        Drawings, GRs, circulars, useful documents and training videos related to road &amp; building works.
                    </p>
                </div>
                <button
                    onClick={openAdd}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                    <Plus className="w-4 h-4" /> Add Resource
                </button>
            </div>

            {/* Tabs + Filters */}
            <div className="bg-emerald-50/70 border-2 border-emerald-200 rounded-2xl p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                    {([
                        { key: 'all', label: 'All Resources', count: counts.all, icon: BookOpen },
                        { key: 'document', label: 'Documents', count: counts.document, icon: FileText },
                        { key: 'video', label: 'Videos', count: counts.video, icon: Youtube },
                    ] as const).map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => setKindFilter(tab.key)}
                            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                kindFilter === tab.key
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                                    : 'bg-white border-emerald-200 text-emerald-800 hover:bg-emerald-100/60'
                            }`}
                        >
                            <tab.icon className="w-3.5 h-3.5" />
                            {tab.label}
                            <span className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                                kindFilter === tab.key ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
                            }`}>
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                    <div className="relative w-full sm:w-72">
                        <Search className="w-4 h-4 text-emerald-700 absolute left-3.5 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search title, tags, uploader..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9.5 pr-4 py-2 text-xs bg-white border border-emerald-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-medium"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 text-xs bg-white border border-emerald-200 rounded-xl text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                        <option value="ALL">All Categories</option>
                        {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        <option value="Video">Video</option>
                    </select>
                </div>
            </div>

            {/* Resource Grid */}
            {filtered.length === 0 ? (
                <div className="bg-white border-2 border-dashed border-emerald-200 rounded-2xl py-16 text-center">
                    <AlertCircle className="w-9 h-9 text-emerald-500 mx-auto mb-3" />
                    <p className="text-slate-600 font-semibold text-sm">
                        {items.length === 0 ? 'No resources added yet.' : 'No resources match your filters.'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                        {items.length === 0 ? 'Click "Add Resource" to upload a drawing, GR, document or YouTube link.' : 'Try a different search or category.'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {filtered.map((item) => {
                        const isVideo = item.kind === 'video';
                        const thumb = isVideo ? youtubeThumbnailUrl(item.videoUrl) : null;
                        const icon = fileIconStyle(item.fileName);
                        const badgeLabel = isVideo ? 'Video' : (item.category || 'Document');

                        return (
                            <div key={item._id} className="group bg-white border-2 border-emerald-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-shadow flex flex-col">
                                {isVideo ? (
                                    <button
                                        onClick={() => setPlaying(item)}
                                        className="relative h-40 w-full bg-slate-900 flex items-center justify-center overflow-hidden cursor-pointer"
                                        title="Play video"
                                    >
                                        {thumb ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={thumb} alt="" className="absolute inset-0 h-full w-full object-cover opacity-80 group-hover:opacity-60 transition-opacity" />
                                        ) : (
                                            <Youtube className="w-10 h-10 text-rose-500" />
                                        )}
                                        <span className="relative z-10 inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/95 shadow-lg">
                                            <Play className="w-5 h-5 text-rose-600 ml-0.5" fill="currentColor" />
                                        </span>
                                    </button>
                                ) : (
                                    <div className="h-24 bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-between px-5 border-b border-emerald-100">
                                        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl ${icon.bg} ${icon.text} font-extrabold text-[10px]`}>
                                            {icon.label}
                                        </div>
                                        <FileText className={`w-8 h-8 ${icon.text} opacity-40`} />
                                    </div>
                                )}

                                <div className="p-4 flex-1 flex flex-col gap-2">
                                    <div className="flex items-start justify-between gap-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${CATEGORY_STYLES[badgeLabel] || CATEGORY_STYLES.Other}`}>
                                            {badgeLabel}
                                        </span>
                                        <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">{formatDate(item.createdAt)}</span>
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800 leading-snug break-words">{item.title}</h3>
                                        {item.description && (
                                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                                        )}
                                    </div>

                                    {(item.tags || []).length > 0 && (
                                        <div className="flex flex-wrap gap-1.5">
                                            {(item.tags || []).map((tag) => (
                                                <span key={tag} className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-semibold">
                                                    #{tag}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="mt-auto pt-3 flex items-center justify-between gap-2 border-t border-slate-100">
                                        <div className="min-w-0">
                                            <p className="text-[10px] text-slate-400 font-semibold truncate">
                                                Added by {item.createdByName || 'Unknown'}
                                            </p>
                                            {!isVideo && item.fileName && (
                                                <p className="text-[10px] text-slate-400 truncate">
                                                    {item.fileName}{item.fileSize ? ` · ${formatBytes(item.fileSize)}` : ''}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {isVideo ? (
                                                <button
                                                    onClick={() => setPlaying(item)}
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                                    title="Play video"
                                                >
                                                    <Play className="w-3.5 h-3.5" /> Play
                                                </button>
                                            ) : (
                                                <a
                                                    href={blobViewUrl(item.fileUrl)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                                                    title="Open document"
                                                >
                                                    <Eye className="w-3.5 h-3.5" /> View
                                                </a>
                                            )}
                                            {canManage(item) && (
                                                <>
                                                    <button
                                                        onClick={() => openEdit(item)}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md cursor-pointer transition-colors"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item)}
                                                        disabled={deletingId === item._id}
                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer transition-colors disabled:opacity-50"
                                                        title="Delete"
                                                    >
                                                        {deletingId === item._id
                                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                                            : <Trash2 className="w-4 h-4" />}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ADD / EDIT MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl border border-emerald-200 shadow-xl max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col">
                        <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                                    <GraduationCap className="w-4 h-4" />
                                </span>
                                <h3 className="text-sm font-bold text-slate-800">
                                    {editing ? 'Edit Resource' : 'Add Resource'}
                                </h3>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs overflow-y-auto">
                            {/* Kind toggle */}
                            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => setForm((prev) => ({ ...prev, kind: 'document', videoUrl: '' }))}
                                    className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
                                        form.kind === 'document' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <FileText className="w-4 h-4" /> Document / Drawing
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setForm((prev) => ({ ...prev, kind: 'video', fileUrl: '', fileName: '', fileSize: 0 }))}
                                    className={`inline-flex items-center justify-center gap-1.5 py-2 rounded-lg font-bold transition-colors cursor-pointer ${
                                        form.kind === 'video' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    <Youtube className="w-4 h-4" /> YouTube Video
                                </button>
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">
                                    Title <span className="text-rose-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. Standard Drawing for RCC Culvert, GR dated 12/03/2025..."
                                    value={form.title}
                                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                                    required
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {form.kind === 'document' ? (
                                <>
                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">Category</label>
                                        <select
                                            value={form.category}
                                            onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        >
                                            {DOC_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block font-bold text-slate-700 mb-1">
                                            File <span className="text-rose-500">*</span>
                                        </label>
                                        <div className="border border-dashed border-emerald-300 rounded-xl p-4 bg-emerald-50/40 text-center">
                                            {form.fileUrl ? (
                                                <div className="flex items-center justify-between bg-white border border-emerald-200 p-2.5 rounded-lg gap-2">
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <FileText className="w-5 h-5 text-rose-600 flex-shrink-0" />
                                                        <div className="min-w-0 text-left">
                                                            <span className="block font-semibold text-slate-800 truncate">{form.fileName || 'Attached file'}</span>
                                                            {form.fileSize ? <span className="text-[10px] text-slate-400">{formatBytes(form.fileSize)}</span> : null}
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <a
                                                            href={blobViewUrl(form.fileUrl)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                                                            title="Preview"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </a>
                                                        <button
                                                            type="button"
                                                            onClick={() => setForm((prev) => ({ ...prev, fileUrl: '', fileName: '', fileSize: 0 }))}
                                                            className="p-1 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                                            title="Remove file"
                                                        >
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : (
                                                <label className="cursor-pointer flex flex-col items-center justify-center py-2">
                                                    {uploading ? (
                                                        <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mb-1" />
                                                    ) : (
                                                        <Upload className="w-6 h-6 text-emerald-600 mb-1" />
                                                    )}
                                                    <span className="font-bold text-emerald-800">
                                                        {uploading ? 'Uploading...' : 'Click to upload a file'}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 mt-0.5">PDF, Word or image · max 10 MB</span>
                                                    <input
                                                        type="file"
                                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                                        onChange={handleFileUpload}
                                                        disabled={uploading}
                                                        className="hidden"
                                                    />
                                                </label>
                                            )}
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <label className="block font-bold text-slate-700 mb-1">
                                        YouTube Video Link <span className="text-rose-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <Link2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                        <input
                                            type="url"
                                            placeholder="https://www.youtube.com/watch?v=..."
                                            value={form.videoUrl}
                                            onChange={(e) => setForm((prev) => ({ ...prev, videoUrl: e.target.value }))}
                                            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </div>
                                    {form.videoUrl && (
                                        previewThumb ? (
                                            <div className="mt-2 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                                <img src={previewThumb} alt="" className="w-20 h-12 object-cover rounded-md" />
                                                <span className="text-[10px] font-semibold text-emerald-700">Valid YouTube link</span>
                                            </div>
                                        ) : (
                                            <p className="mt-1 text-[10px] font-semibold text-rose-600">Unrecognised YouTube link.</p>
                                        )
                                    )}
                                </div>
                            )}

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Description / Notes</label>
                                <textarea
                                    rows={2}
                                    placeholder="Short description, reference number, applicability..."
                                    value={form.description}
                                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="block font-bold text-slate-700 mb-1">Tags</label>
                                <input
                                    type="text"
                                    placeholder="comma separated, e.g. culvert, 2025, RCC"
                                    value={form.tags}
                                    onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>

                            {formError && (
                                <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-3 py-2">
                                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                    <span className="font-semibold">{formError}</span>
                                </div>
                            )}

                            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-50 cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || uploading}
                                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                                >
                                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                    {editing ? 'Update Resource' : 'Save Resource'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VIDEO PLAYER LIGHTBOX */}
            {playing && (
                <div
                    className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4"
                    onClick={() => setPlaying(null)}
                >
                    <div className="w-full max-w-3xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2 gap-3">
                            <h3 className="text-sm font-bold text-white truncate">{playing.title}</h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <a
                                    href={playing.videoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-[11px] font-bold transition-colors"
                                >
                                    <Download className="w-3.5 h-3.5 inline mr-1" /> Open on YouTube
                                </a>
                                <button
                                    onClick={() => setPlaying(null)}
                                    className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg cursor-pointer"
                                    aria-label="Close video"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        {embedUrl ? (
                            <div className="aspect-video w-full rounded-2xl overflow-hidden bg-black shadow-2xl">
                                <iframe
                                    src={embedUrl}
                                    title={playing.title}
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className="w-full h-full"
                                />
                            </div>
                        ) : (
                            <p className="text-white text-sm">Invalid video link.</p>
                        )}
                        {playing.description && (
                            <p className="text-xs text-slate-200 mt-3">{playing.description}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
