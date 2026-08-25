import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Package from '@/models/Package';
import { parseDateStr } from '@/lib/dateUtils';

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        if (body.committeeDate !== undefined) {
            body.committeeDate = body.committeeDate ? parseDateStr(body.committeeDate) : null;
        }

        const pkg = await Package.create(body);

        return NextResponse.json({ success: true, data: pkg }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const limit = parseInt(searchParams.get('limit') || '100', 10);
        const skip = (page - 1) * limit;

        const total = await Package.countDocuments({});
        const packages = await Package.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
        
        return NextResponse.json({ 
            success: true, 
            data: packages,
            pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
        });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
