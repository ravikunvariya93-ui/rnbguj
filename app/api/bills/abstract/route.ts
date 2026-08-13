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
        const previousBills = await Bill.find({ workOrderId: workOrderId as any });
        
        const previousPaidMap: Record<string, number> = {};
        let totalPreviouslyPaid = 0;
        
        for (const bill of previousBills) {
            // Sum grossAmount (or netPayableAmount) from each previous bill for the Audit Memo field
            totalPreviouslyPaid += bill.grossAmount || bill.netPayableAmount || 0;

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
                boqQuantity: boqItem.quantity || 0,
                quantity: 0,
                fullRate: boqItem.rate,
                partRate: boqItem.rate,
                unit: boqItem.unit,
                uptoDateAmount: 0,
                previousPaidAmount: prevPaid,
                toBePaidAmount: 0,
                itemType: boqItem.itemType || 'Standard'
            };
        });

        const tenderPct = tender?.aboveBelowPercentage !== undefined ? tender.aboveBelowPercentage : 0;
        let tenderDir = tender?.aboveBelowInWord || 'Above';
        if (tenderDir === 'Equals') tenderDir = 'At Par';

        const contractPrice = tender?.contractPrice || tender?.estimatedAmount || 0;
        const submittedSD = workOrder?.securityDepositAmount || tender?.securityDepositAmount || 0;

        const works = (packageDoc?.works || []).map((w: any, i: number) => ({
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

    } catch (error) {
        console.error('Error fetching bill abstract:', error);
        return NextResponse.json({ success: false, error: (error as any).message }, { status: 500 });
    }
}
