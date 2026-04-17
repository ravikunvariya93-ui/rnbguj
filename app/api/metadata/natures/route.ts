import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ApprovedWork from '@/models/ApprovedWork';

export async function GET() {
    try {
        await dbConnect();
        const natures = await ApprovedWork.distinct('natureOfWork');
        // Filter out empty/null values and sort
        const filteredNatures = natures.filter(Boolean).sort();
        return NextResponse.json(filteredNatures);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
