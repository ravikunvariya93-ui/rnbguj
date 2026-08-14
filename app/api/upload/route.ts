import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { existsSync } from 'fs';

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

        // Target upload directory
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', subfolder);
        if (!existsSync(uploadDir)) {
            await fs.mkdir(uploadDir, { recursive: true });
        }

        // Sanitize and create unique filename
        const safeOriginalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const uniquePrefix = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
        const finalFilename = `${uniquePrefix}_${safeOriginalName}`;
        const filePath = path.join(uploadDir, finalFilename);

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        await fs.writeFile(filePath, buffer);

        const fileUrl = `/uploads/${subfolder}/${finalFilename}`;

        return NextResponse.json({
            success: true,
            fileUrl,
            fileName: file.name,
            fileSize: file.size,
        });
    } catch (error: any) {
        console.error('File upload error:', error);
        return NextResponse.json({ error: error.message || 'Failed to upload file' }, { status: 500 });
    }
}
