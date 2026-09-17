import Package from '@/models/Package';
import DTP from '@/models/DTP';
import Tender from '@/models/Tender';
import Approval from '@/models/Approval';
import LOA from '@/models/LOA';
import WorkOrder from '@/models/WorkOrder';

/**
 * Deep cascade delete for a package and its tender subtree.
 * Lives in a service so the route stays thin and the operation is reusable.
 */
export async function deletePackageCascade(packageId: string) {
  await DTP.deleteMany({ tsId: packageId } as never);
  const tenders = await Tender.find({ packageId } as never);
  for (const tender of tenders) {
    const loas = await LOA.find({ tenderId: tender._id } as never);
    for (const loa of loas) {
      await WorkOrder.deleteMany({ loaId: loa._id } as never);
      await LOA.findByIdAndDelete(loa._id);
    }
    await Approval.deleteMany({ tenderId: tender._id } as never);
    await Tender.findByIdAndDelete(tender._id);
  }
  return Package.findByIdAndDelete(packageId);
}
