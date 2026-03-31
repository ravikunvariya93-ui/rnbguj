import dbConnect from '@/lib/db';
import Approval from '@/models/Approval';
import Tender from '@/models/Tender';
import { NextResponse } from 'next/server';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    try {
        const approval = await Approval.findById(id).populate('tenderId');
        if (!approval) {
            return NextResponse.json({ success: false, error: 'Approval not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: approval });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to fetch Approval' }, { status: 400 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    try {
        const body = await req.json();
        const approval = await Approval.findByIdAndUpdate(id, body, { new: true, runValidators: true });
        if (!approval) {
            return NextResponse.json({ success: false, error: 'Approval not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: approval });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to update Approval' }, { status: 400 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    await dbConnect();
    const { id } = await params;
    try {
        const deletedApproval = await Approval.findByIdAndDelete(id);
        if (!deletedApproval) {
            return NextResponse.json({ success: false, error: 'Approval not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to delete Approval' }, { status: 400 });
    }
}
