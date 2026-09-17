import Bill from '@/models/Bill';
import Package from '@/models/Package';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import WorkOrder from '@/models/WorkOrder';

// Keep populate targets registered for route-splitting (matches existing pattern).
void WorkOrder;
void LOA;
void Tender;
void Package;

/** Verify an auditor may access a bill via the Package.subDivision chain. */
export async function auditorCanAccessBill(billId: string, auditorSubDivision: string): Promise<boolean> {
  const bill = (await Bill.findById(billId)
    .populate({ path: 'workOrderId', populate: { path: 'loaId', populate: { path: 'tenderId' } } })
    .lean()) as unknown as {
    workOrderId?: { loaId?: { tenderId?: { packageId?: unknown } } };
  } | null;
  if (!bill) return false;
  const packageId = bill?.workOrderId?.loaId?.tenderId?.packageId;
  if (!packageId) return false;
  const pkg = (await Package.findById(packageId).select('subDivision').lean()) as unknown as {
    subDivision?: string;
  } | null;
  return (pkg?.subDivision || '').toLowerCase() === auditorSubDivision.toLowerCase();
}

/**
 * Work-order ids visible to an auditor's sub-division. Single place for the
 * Package → Tender → LOA → WorkOrder chain so list + create stay in sync.
 */
export async function getAuditorWorkOrderIds(auditorSubDivision: string) {
  const packageIds = (await Package.find({
    subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') },
  }).distinct('_id')) as any[];
  const tenderIds = (await Tender.find({ packageId: { $in: packageIds } } as any).distinct('_id')) as any[];
  const loaIds = (await LOA.find({ tenderId: { $in: tenderIds } } as any).distinct('_id')) as any[];
  return (await WorkOrder.find({ loaId: { $in: loaIds } } as any).distinct('_id')) as any[];
}
