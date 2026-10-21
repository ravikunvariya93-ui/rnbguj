import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import KnowledgeResource, { KNOWLEDGE_CATEGORIES, type KnowledgeCategory } from '@/models/KnowledgeResource';
import { auth } from '@/auth';
import { youtubeVideoId } from '@/lib/youtube';

function sessionUser(session: unknown): { id?: string; name?: string } {
  return ((session as { user?: { id?: string; name?: string } } | null | undefined)?.user) ?? {};
}

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

// GET /api/knowledge — every signed-in user can browse the Knowledge Center.
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const kind = searchParams.get('kind');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const query: Record<string, unknown> = {};
    if (kind === 'document' || kind === 'video') query.kind = kind;
    if (category) query.category = category;
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [{ title: rx }, { description: rx }, { tags: rx }, { createdByName: rx }];
    }

    const items = await KnowledgeResource.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json({ success: true, data: items });
  } catch (error: unknown) {
    console.error('Failed to fetch knowledge resources:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch knowledge resources' }, { status: 500 });
  }
}

// POST /api/knowledge — any signed-in user can upload a document or add a video.
export async function POST(req: NextRequest) {
  const session = await auth();
  const user = sessionUser(session);
  if (!user.id) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  try {
    await dbConnect();
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
    const created = await KnowledgeResource.create({
      title: title.slice(0, 200),
      description: String(body?.description || '').trim(),
      kind,
      category: normalizeCategory(body?.category, kind),
      fileUrl: isVideo ? undefined : fileUrl,
      fileName: isVideo ? undefined : String(body?.fileName || '').trim() || undefined,
      fileSize: isVideo ? undefined : Number(body?.fileSize) || undefined,
      videoUrl: isVideo ? rawVideoUrl : undefined,
      tags: normalizeTags(body?.tags),
      createdBy: user.id,
      createdByName: user.name || '',
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: unknown) {
    console.error('Failed to create knowledge resource:', error);
    return NextResponse.json({ success: false, error: 'Failed to save knowledge resource' }, { status: 500 });
  }
}
