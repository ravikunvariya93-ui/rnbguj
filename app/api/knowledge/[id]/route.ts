import { NextRequest, NextResponse } from 'next/server';
import { del } from '@vercel/blob';
import dbConnect from '@/lib/db';
import KnowledgeResource, { KNOWLEDGE_CATEGORIES, type KnowledgeCategory } from '@/models/KnowledgeResource';
import { auth } from '@/auth';
import { isAdminSession } from '@/lib/accessServer';
import { youtubeVideoId } from '@/lib/youtube';

function normalizeCategory(value: unknown, kind: 'document' | 'video'): KnowledgeCategory {
  if (kind === 'video') return 'Other';
  const raw = String(value || '');
  return (KNOWLEDGE_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as KnowledgeCategory)
    : 'Document';
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((t) => String(t).trim()).filter(Boolean).slice(0, 20);
  }
  return String(value || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 20);
}

async function canManage(session: unknown, createdBy: string): Promise<boolean> {
  const uid = (session as { user?: { id?: string } } | null | undefined)?.user?.id;
  if (!uid) return false;
  if (uid === createdBy) return true;
  return isAdminSession(session);
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await dbConnect();
    const { id } = await params;
    const existing = await KnowledgeResource.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Knowledge resource not found' }, { status: 404 });
    }
    if (!(await canManage(session, existing.createdBy))) {
      return NextResponse.json({ success: false, error: 'You can only edit your own uploads' }, { status: 403 });
    }

    const body = await req.json();
    const title = String(body?.title || '').trim();
    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const rawVideoUrl = String(body?.videoUrl || '').trim();
    const fileUrl = String(body?.fileUrl || '').trim();
    const isVideo = !!rawVideoUrl;

    if (isVideo) {
      if (!youtubeVideoId(rawVideoUrl)) {
        return NextResponse.json({ success: false, error: 'Please enter a valid YouTube video link' }, { status: 400 });
      }
    } else if (!fileUrl) {
      return NextResponse.json({ success: false, error: 'Please upload a document or add a YouTube link' }, { status: 400 });
    }

    const kind = isVideo ? 'video' : 'document';
    const previousFileUrl = existing.fileUrl;

    const update: Record<string, unknown> = {
      title: title.slice(0, 200),
      description: String(body?.description || '').trim(),
      kind,
      category: normalizeCategory(body?.category, kind),
      tags: normalizeTags(body?.tags),
    };
    const unset: Record<string, ''> = {};

    if (isVideo) {
      update.videoUrl = rawVideoUrl;
      unset.fileUrl = '';
      unset.fileName = '';
      unset.fileSize = '';
    } else {
      update.fileUrl = fileUrl;
      const fileName = String(body?.fileName || '').trim();
      const fileSize = Number(body?.fileSize) || 0;
      if (fileName) update.fileName = fileName; else unset.fileName = '';
      if (fileSize) update.fileSize = fileSize; else unset.fileSize = '';
      unset.videoUrl = '';
    }

    const updated = await KnowledgeResource.findByIdAndUpdate(
      id,
      { $set: update, ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}) },
      { new: true }
    ).lean();
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Knowledge resource not found' }, { status: 404 });
    }

    // The old attachment is no longer referenced — clean it up.
    if (previousFileUrl && previousFileUrl !== updated.fileUrl && previousFileUrl.includes('.blob.vercel-storage.com')) {
      try {
        await del(previousFileUrl);
      } catch (err) {
        console.warn('Failed to delete replaced file from Vercel Blob:', err);
      }
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    console.error('Failed to update knowledge resource:', error);
    return NextResponse.json({ success: false, error: 'Failed to update knowledge resource' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  const uid = (session?.user as { id?: string } | undefined)?.id;
  if (!uid) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await dbConnect();
    const { id } = await params;
    const existing = await KnowledgeResource.findById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Knowledge resource not found' }, { status: 404 });
    }
    if (!(await canManage(session, existing.createdBy))) {
      return NextResponse.json({ success: false, error: 'You can only delete your own uploads' }, { status: 403 });
    }

    if (existing.fileUrl && existing.fileUrl.includes('.blob.vercel-storage.com')) {
      try {
        await del(existing.fileUrl);
      } catch (err) {
        console.warn('Failed to delete file from Vercel Blob:', err);
      }
    }

    await KnowledgeResource.findByIdAndDelete(id);
    return NextResponse.json({ success: true, message: 'Knowledge resource deleted successfully' });
  } catch (error: unknown) {
    console.error('Failed to delete knowledge resource:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete knowledge resource' }, { status: 500 });
  }
}
