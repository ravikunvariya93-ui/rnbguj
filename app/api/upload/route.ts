import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import path from 'path';
import { auth } from '@/auth';

const ALLOWED_FOLDERS = new Set(['excess-proposals', 'bills', 'tenders', 'packages', 'progress']);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

export async function POST(req: NextRequest) {
    try {
        const session = await auth();
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const requestedFolder = ((formData.get('folder') as string) || 'excess-proposals').replace(/[^a-zA-Z0-9-]/g, '');
        const subfolder = ALLOWED_FOLDERS.has(requestedFolder) ? requestedFolder : 'excess-proposals';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        if (file.size > MAX_FILE_BYTES) {
            return NextResponse.json({ error: 'File too large. Max 10MB.' }, { status: 400 });
        }

        // Validate file type (allow PDF and common documents)
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
        const allowedMime = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/jpeg', 'image/png']);
        const ext = path.extname(file.name).toLowerCase();
        if (!allowedExtensions.includes(ext) || (file.type && !allowedMime.has(file.type))) {
            return NextResponse.json({ error: 'Invalid file type. Only PDF and document files are permitted.' }, { status: 400 });
        }

        // Sanitize and create unique filename
        const safeOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const finalFilename = `${uniquePrefix}_${safeOriginalName}`;

        // Upload to Vercel Blob — don't trust client MIME
        const contentType = ext === '.pdf' ? 'application/pdf' : ext === '.png' ? 'image/png' : ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' : 'application/octet-stream';
        const blob = await put(`${subfolder}/${finalFilename}`, file, {
            access: 'private',
            addRandomSuffix: false,
            contentType,
        });

        return NextResponse.json({
            success: true,
            fileUrl: blob.url,
            fileName: file.name,
            fileSize: file.size,
        });
    } catch (error: unknown) {
        console.error('File upload error:', error);
        return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }
}
