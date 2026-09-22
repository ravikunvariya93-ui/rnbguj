import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import WorkOrder from '@/models/WorkOrder';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import Package from '@/models/Package';
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

        // 1. Get WorkOrder -> LOA -> Tender -> Package
        const workOrder = await WorkOrder.findById(workOrderId);
        if (!workOrder) {
            return NextResponse.json({ success: false, error: 'Work Order not found' }, { status: 404 });
        }

        const loa = await LOA.findById(workOrder.loaId);
        if (!loa) {
            return NextResponse.json({ success: false, error: 'LOA not found' }, { status: 404 });
        }

        const tender = await Tender.findById(loa.tenderId);
        const packageDoc = tender?.packageId ? await Package.findById(tender.packageId) : null;

        // 2. Get BOQ by Tender ID
        const boq = await BOQ.findOne({ tenderId: loa.tenderId });
        if (!boq) {
            return NextResponse.json({ success: false, error: 'BOQ not found for this Tender' }, { status: 404 });
        }

        // 3. Find previous bills for this WorkOrder to calculate previousPaidAmount
        const previousBills = await Bill.find({ workOrderId: workOrderId } as unknown as Parameters<typeof Bill.find>[0]).sort({ runningBillNumber: 1 });
        
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

        // Gross is cumulative up-to-date, so Previously Paid = last bill's gross
        // (NOT the sum of all previous gross amounts).
        const lastBill = previousBills.length > 0 ? previousBills[previousBills.length - 1] : null;
        const totalPreviouslyPaid = lastBill
            ? (lastBill.grossAmount ?? lastBill.netPayableAmount ?? 0)
            : 0;

        // 4. Construct the abstract template based on BOQ items
        const abstractItems = boq.items.map((boqItem: { itemNo: string; description: string; quantity?: number; rate: number; unit: string; itemType?: string }) => {
            const prevPaid = previousPaidMap[boqItem.itemNo] || 0;
            return {
                itemNo: boqItem.itemNo,
                description: boqItem.description,
                boqQuantity: boqItem.quantity || 0,
                quantity: 0,
                fullRate: boqItem.rate,
                partRate: boqItem.rate,
                unit: boqItem.unit,
                uptoDateAmount: 0,
                previousPaidAmount: prevPaid,
                toBePaidAmount: 0,
                itemType: boqItem.itemType || 'Standard',
                considerForAsphalt: false
            };
        });

        const tenderPct = tender?.aboveBelowPercentage !== undefined ? tender.aboveBelowPercentage : 0;
        let tenderDir = tender?.aboveBelowInWord || 'Above';
        if (tenderDir === 'Equals') tenderDir = 'At Par';

        const contractPrice = tender?.contractPrice || tender?.estimatedAmount || 0;
        const submittedSD = workOrder?.securityDepositAmount || tender?.securityDepositAmount || 0;

        const works = (packageDoc?.works || []).map((w: { workName?: string; nameOfWork?: string }, i: number) => ({
            srNo: String(i + 1),
            nameOfWork: w.workName || w.nameOfWork || '',
            amount: 0
        }));

        return NextResponse.json({ 
            success: true, 
            data: abstractItems,
            works,
            tenderPercentage: tenderPct,
            tenderDirection: tenderDir,
            contractPrice,
            submittedSD,
            previouslyPaid: totalPreviouslyPaid
        });

    } catch (error: unknown) {
        console.error('Error fetching bill abstract:', error);
        return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
