import dbConnect from '@/lib/db';
import DTP from '@/models/DTP';
import TechnicalSanction from '@/models/TechnicalSanction';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    try {
        const dtp = await DTP.findById(id).populate('tsId');
        if (!dtp) return NextResponse.json({ success: false, error: 'DTP not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: dtp });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch DTP' }, { status: 400 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    try {
        const body = await req.json();
        const dtp = await DTP.findByIdAndUpdate(id, body, { new: true, runValidators: true });
        if (!dtp) return NextResponse.json({ success: false, error: 'DTP not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: dtp });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to update DTP' }, { status: 400 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    try {
        const deleted = await DTP.findByIdAndDelete(id);
        if (!deleted) return NextResponse.json({ success: false, error: 'DTP not found' }, { status: 404 });
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to delete DTP' }, { status: 400 });
    }
}
