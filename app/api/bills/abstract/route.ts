import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import BOQ from '@/models/BOQ';
import Bill from '@/models/Bill';

export async function GET(request: Request) {
    try {
        await dbConnect();
        
        const { searchParams } = new URL(request.url);
        const workOrderId = searchParams.get('workOrderId');
        
        if (!workOrderId) {
            return NextResponse.json({ success: false, error: 'workOrderId is required' }, { status: 400 });
        }

        // 1. Get WorkOrder -> LOA -> Tender
        const workOrder = await WorkOrder.findById(workOrderId);
        if (!workOrder) {
            return NextResponse.json({ success: false, error: 'Work Order not found' }, { status: 404 });
        }

        const loa = await LOA.findById(workOrder.loaId);
        if (!loa) {
            return NextResponse.json({ success: false, error: 'LOA not found' }, { status: 404 });
        }

        // 2. Get BOQ by Tender ID
        const boq = await BOQ.findOne({ tenderId: loa.tenderId });
        if (!boq) {
            return NextResponse.json({ success: false, error: 'BOQ not found for this Tender' }, { status: 404 });
        }

        // 3. Find previous bills for this WorkOrder to calculate previousPaidAmount
        // (Assuming we just sum up the toBePaidAmount from previous bills for each item)
        const previousBills = await Bill.find({ workOrderId: workOrderId as any });
        
        const previousPaidMap: Record<string, number> = {};
        
        for (const bill of previousBills) {
            if (bill.items && bill.items.length > 0) {
                for (const item of bill.items) {
                    if (!previousPaidMap[item.itemNo]) {
                        previousPaidMap[item.itemNo] = 0;
                    }
                    previousPaidMap[item.itemNo] += item.toBePaidAmount || 0;
                }
            }
        }

        // 4. Construct the abstract template based on BOQ items
        const abstractItems = boq.items.map((boqItem: any) => {
            const prevPaid = previousPaidMap[boqItem.itemNo] || 0;
            return {
                itemNo: boqItem.itemNo,
                description: boqItem.description,
                quantity: 0, // Default for new bill
                fullRate: boqItem.rate,
                partRate: boqItem.rate, // Default to full rate
                unit: boqItem.unit,
                uptoDateAmount: 0,
                previousPaidAmount: prevPaid,
                toBePaidAmount: 0,
                itemType: boqItem.itemType || 'Standard'
            };
        });

        return NextResponse.json({ success: true, data: abstractItems });

    } catch (error) {
        console.error('Error fetching bill abstract:', error);
        return NextResponse.json({ success: false, error: (error as any).message }, { status: 500 });
    }
}
