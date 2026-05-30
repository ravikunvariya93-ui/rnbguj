import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ApprovedWork from '@/models/ApprovedWork';

export async function GET() {
    try {
        await dbConnect();
        const budgetHeads = await ApprovedWork.distinct('budgetHead');
        const filtered = budgetHeads.filter(Boolean).sort();
        return NextResponse.json(filtered);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
