import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Agency from '@/models/Agency';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const agency = await Agency.findById(id);
        if (!agency) {
            return NextResponse.json({ success: false, error: 'Agency not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: agency });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await request.json();
        const agency = await Agency.findByIdAndUpdate(id, body, { new: true, runValidators: true });
        if (!agency) {
            return NextResponse.json({ success: false, error: 'Agency not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: agency });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        await dbConnect();
        const { id } = await params;
        const agency = await Agency.findByIdAndDelete(id);
        if (!agency) {
            return NextResponse.json({ success: false, error: 'Agency not found' }, { status: 404 });
        }
        return NextResponse.json({ success: true, data: {} });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
