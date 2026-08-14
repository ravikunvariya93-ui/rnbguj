import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import ExcessProposal from '@/models/ExcessProposal';
import Package from '@/models/Package';
import fs from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

// Ensure models are registered
void Package;

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const proposal = await ExcessProposal.findById(id)
            .populate('packageId', 'packageName subDivision dtpConsultant')
            .populate('workOrderId', 'agreementNo agreementYear agencyName')
            .lean();

        if (!proposal) {
            return NextResponse.json({ error: 'Excess Proposal not found' }, { status: 400 });
        }

        return NextResponse.json({ success: true, data: proposal });
    } catch (error: any) {
        console.error('Failed to fetch excess proposal:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch excess proposal' }, { status: 500 });
    }
}

export async function PUT(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;
        const body = await req.json();

        const updateData: any = {};
        if (body.proposalNo !== undefined) updateData.proposalNo = body.proposalNo ? body.proposalNo.trim() : '';
        if (body.proposalDate !== undefined) updateData.proposalDate = body.proposalDate ? new Date(body.proposalDate) : null;
        if (body.pdfUrl !== undefined) updateData.pdfUrl = body.pdfUrl;
        if (body.fileName !== undefined) updateData.fileName = body.fileName;
        if (body.fileSize !== undefined) updateData.fileSize = body.fileSize;
        if (body.remarks !== undefined) updateData.remarks = body.remarks;
        if (body.status !== undefined) updateData.status = body.status;
        if (body.excessAmount !== undefined) updateData.excessAmount = body.excessAmount ? Number(body.excessAmount) : null;
        if (body.savingAmount !== undefined) updateData.savingAmount = body.savingAmount ? Number(body.savingAmount) : null;
        if (body.approvalNo !== undefined) updateData.approvalNo = body.approvalNo;
        if (body.approvalDate !== undefined) updateData.approvalDate = body.approvalDate ? new Date(body.approvalDate) : null;
        if (body.approvalAuthority !== undefined) updateData.approvalAuthority = body.approvalAuthority;
        if (body.packageId !== undefined) updateData.packageId = body.packageId;
        if (body.workOrderId !== undefined) updateData.workOrderId = body.workOrderId;

        const updated = await ExcessProposal.findByIdAndUpdate(id, updateData, { new: true })
            .populate('packageId', 'packageName subDivision dtpConsultant')
            .populate('workOrderId', 'agreementNo agreementYear agencyName')
            .lean();

        if (!updated) {
            return NextResponse.json({ error: 'Excess Proposal not found' }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: updated });
    } catch (error: any) {
        console.error('Failed to update excess proposal:', error);
        return NextResponse.json({ error: error.message || 'Failed to update excess proposal' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await dbConnect();
        const { id } = await params;

        const proposal = await ExcessProposal.findById(id);
        if (!proposal) {
            return NextResponse.json({ error: 'Excess Proposal not found' }, { status: 404 });
        }

        // Clean up attached PDF file if it exists on disk
        if (proposal.pdfUrl && proposal.pdfUrl.startsWith('/uploads/')) {
            try {
                const relativePath = proposal.pdfUrl.replace(/^\//, '');
                const filePath = path.join(process.cwd(), 'public', relativePath);
                if (existsSync(filePath)) {
                    await fs.unlink(filePath);
                }
            } catch (err) {
                console.warn('Failed to delete file from disk:', err);
            }
        }

        await ExcessProposal.findByIdAndDelete(id);

        return NextResponse.json({ success: true, message: 'Excess Proposal deleted successfully' });
    } catch (error: any) {
        console.error('Failed to delete excess proposal:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete excess proposal' }, { status: 500 });
    }
}
