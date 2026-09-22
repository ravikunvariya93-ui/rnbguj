import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ApprovedWork from '@/models/ApprovedWork';

export async function GET() {
    try {
        await dbConnect();
        const schemes = await ApprovedWork.distinct('schemeName');
        const filtered = schemes.filter(Boolean).sort();
        return NextResponse.json(filtered);
    } catch (error: unknown) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
