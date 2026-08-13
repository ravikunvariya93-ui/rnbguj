import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ApprovedWork from '@/models/ApprovedWork';
import Package from '@/models/Package';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        await dbConnect();
        const [budgetHeadsAw, budgetHeadsPkg] = await Promise.all([
            ApprovedWork.distinct('budgetHead'),
            Package.distinct('budgetHead')
        ]);
        const combined = Array.from(new Set([...budgetHeadsAw, ...budgetHeadsPkg]));
        const filtered = combined.filter(Boolean).sort();
        return NextResponse.json(filtered);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
