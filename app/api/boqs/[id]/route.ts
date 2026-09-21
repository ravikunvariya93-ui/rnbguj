import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import BOQ from '@/models/BOQ';
import Tender from '@/models/Tender';

// Ensure Tender model is registered for populate
void Tender;

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const boq = await BOQ.findById(id).populate({
            path: 'tenderId',
            select: 'tenderId packageName'
        });
        if (!boq) return NextResponse.json({ success: false, error: 'BOQ not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: boq });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();
        const boq = await BOQ.findByIdAndUpdate(id, body, { new: true, runValidators: true });
        if (!boq) return NextResponse.json({ success: false, error: 'BOQ not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: boq });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const boq = await BOQ.findByIdAndDelete(id);
        if (!boq) return NextResponse.json({ success: false, error: 'BOQ not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: { message: 'BOQ deleted' } });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
