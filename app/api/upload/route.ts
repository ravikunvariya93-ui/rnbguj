import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;
        const subfolder = (formData.get('folder') as string) || 'excess-proposals';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Validate file type (allow PDF and common documents)
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.name).toLowerCase();
        if (!allowedExtensions.includes(ext)) {
            return NextResponse.json({ error: 'Invalid file type. Only PDF and document files are permitted.' }, { status: 400 });
        }

        // Sanitize and create unique filename
        const safeOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const finalFilename = `${uniquePrefix}_${safeOriginalName}`;

        // Upload to Vercel Blob
        const blob = await put(`${subfolder}/${finalFilename}`, file, {
            access: 'public',
            addRandomSuffix: false,
            contentType: file.type,
        });

        return NextResponse.json({
            success: true,
            fileUrl: blob.url,
            fileName: file.name,
            fileSize: file.size,
        });
    } catch (error: any) {
        console.error('File upload error:', error);
        return NextResponse.json({ error: error.message || 'Failed to upload file' }, { status: 500 });
    }
}
