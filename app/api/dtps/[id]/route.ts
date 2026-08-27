import dbConnect from '@/lib/db';
import DTP from '@/models/DTP';
import Package from '@/models/Package';
import Tender from '@/models/Tender';
import { NextResponse } from 'next/server';

// Ensure Package model is registered for populate
void Package;

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
        if (dtp.tsId && dtp.tenderAmount) {
            await Tender.updateMany(
                { packageId: dtp.tsId, $or: [{ estimatedAmount: { $exists: false } }, { estimatedAmount: null }] },
                { $set: { estimatedAmount: Number(dtp.tenderAmount) } }
            );
        }
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
