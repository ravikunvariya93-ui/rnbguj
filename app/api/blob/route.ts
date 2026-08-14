import { NextRequest, NextResponse } from 'next/server';
import { get } from '@vercel/blob';

const BLOB_URL_PATTERN = /\.public\.blob\.vercel-storage\.com\//;

export async function GET(req: NextRequest) {
    try {
        const url = req.nextUrl.searchParams.get('url');
        if (!url) {
            return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
        }

        if (!BLOB_URL_PATTERN.test(url)) {
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
    } catch (error: any) {
        console.error('Failed to fetch blob:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch file' }, { status: 500 });
    }
}
