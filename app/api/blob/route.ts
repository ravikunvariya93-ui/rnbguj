import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const url = req.nextUrl.searchParams.get('url');
        if (!url) {
            return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
        }

        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch {
            return NextResponse.json({ error: 'Invalid blob url' }, { status: 400 });
        }
        if (parsed.protocol !== 'https:' || !parsed.hostname.endsWith('.blob.vercel-storage.com')) {
            return NextResponse.json({ error: 'Invalid blob url' }, { status: 400 });
        }

        const result = await get(url, { access: 'private' });

        if (!result || result.statusCode !== 200 || !result.stream) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        return new Response(result.stream, {
            headers: {
                'Content-Type': result.blob.contentType || 'application/octet-stream',
                'Content-Length': String(result.blob.size),
                'Content-Disposition': 'inline',
                'Cache-Control': 'public, max-age=3600',
            },
        });
    } catch (error: unknown) {
        console.error('Failed to fetch blob:', error);
        return NextResponse.json({ error: 'Failed to fetch file' }, { status: 500 });
    }
}
