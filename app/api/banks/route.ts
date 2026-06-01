import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Bank from '@/models/Bank';
import WorkOrder from '@/models/WorkOrder';

export async function GET() {
    try {
        await dbConnect();
        
        let banks = await Bank.find({}).sort({ name: 1 });
        
        // Auto-population fallback: if no banks exist in Bank collection,
        // gather unique bank names from WorkOrder and create them in Bank.
        if (banks.length === 0) {
            const workOrders = await WorkOrder.find({}, 'securityDepositBankName additionalSecurityDepositBankName');
            const uniqueNames = new Set<string>();
            for (const wo of workOrders) {
                const b1 = wo.securityDepositBankName ? wo.securityDepositBankName.trim() : '';
                const b2 = wo.additionalSecurityDepositBankName ? wo.additionalSecurityDepositBankName.trim() : '';
                if (b1) uniqueNames.add(b1);
                if (b2) uniqueNames.add(b2);
            }
            
            if (uniqueNames.size > 0) {
                const docs = Array.from(uniqueNames).map(name => ({ name }));
                // Use insertMany with ordered: false to skip duplicate errors if any occur
                try {
                    await Bank.insertMany(docs, { ordered: false });
                } catch (insertErr) {
                    console.error('Non-critical insertMany error during auto-seeding:', insertErr);
                }
                banks = await Bank.find({}).sort({ name: 1 });
            }
        }
        
        return NextResponse.json({ success: true, data: banks });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const name = body.name ? body.name.trim() : '';
        if (!name) {
            return NextResponse.json({ success: false, error: 'Bank name is required.' }, { status: 400 });
        }
        
        // Check if bank name already exists (case-insensitive check)
        const existing = await Bank.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existing) {
            return NextResponse.json({ success: false, error: 'Bank name already exists.' }, { status: 400 });
        }
        
        const bank = await Bank.create({ name });
        return NextResponse.json({ success: true, data: bank }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
}
