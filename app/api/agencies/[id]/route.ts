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
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
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
    } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && (error as { code?: unknown }).code === 11000) {
            return NextResponse.json({ success: false, error: 'A contractor with this name already exists.' }, { status: 409 });
        }
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
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
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 400 });
    }
}
