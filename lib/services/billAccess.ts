import Bill from '@/models/Bill';
import Package from '@/models/Package';
import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import WorkOrder from '@/models/WorkOrder';

type TenderFilter = Parameters<typeof Tender.find>[0];
type LoaFilter = Parameters<typeof LOA.find>[0];
type WorkOrderFilter = Parameters<typeof WorkOrder.find>[0];

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
export async function getAuditorWorkOrderIds(auditorSubDivision: string): Promise<string[]> {
  // Ids travel as strings (the driver casts at runtime). Filter objects go
  // through FilterQuery assertions because the repo's strict Mongoose types
  // reject cross-copy ObjectId/string inputs at compile time.
  const packageIds: string[] = (await Package.find({
    subDivision: { $regex: new RegExp(`^${auditorSubDivision}$`, 'i') },
  }).distinct('_id')).map(String);
  const tenderIds: string[] = (await Tender.find(
    { packageId: { $in: packageIds } } as unknown as TenderFilter,
  ).distinct('_id')).map(String);
  const loaIds: string[] = (await LOA.find(
    { tenderId: { $in: tenderIds } } as unknown as LoaFilter,
  ).distinct('_id')).map(String);
  return (await WorkOrder.find(
    { loaId: { $in: loaIds } } as unknown as WorkOrderFilter,
  ).distinct('_id')).map(String);
}
