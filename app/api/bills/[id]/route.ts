import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Bill from '@/models/Bill';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const bill = await Bill.findById(id).populate({
            path: 'workOrderId',
            populate: {
                path: 'loaId',
                populate: { path: 'tenderId' }
            }
        });
        if (!bill) {
            return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: bill });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as any).message }, { status: 400 });
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
        const bill = await Bill.findByIdAndUpdate(id, body, {
            new: true,
            runValidators: true,
        });
        if (!bill) {
            return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: bill });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as any).message }, { status: 400 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const bill = await Bill.findByIdAndDelete(id);
        if (!bill) {
            return NextResponse.json({ success: false, error: 'Bill not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: bill });
    } catch (error) {
        return NextResponse.json({ success: false, error: (error as any).message }, { status: 400 });
    }
}
