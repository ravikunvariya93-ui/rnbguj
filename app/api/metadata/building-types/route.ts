import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ApprovedWork from '@/models/ApprovedWork';
import Package from '@/models/Package';

export async function GET() {
    try {
        await dbConnect();
        const [awTypes, pkgTypes] = await Promise.all([
            ApprovedWork.distinct('buildingType'),
            Package.distinct('buildingType')
        ]);
        const combined = Array.from(new Set([...awTypes, ...pkgTypes])).filter(Boolean).sort();
        return NextResponse.json(combined);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
