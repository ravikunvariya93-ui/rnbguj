import Tender, { type ITender } from '@/models/Tender';
import Approval from '@/models/Approval';
import DTP from '@/models/DTP';

type DtpFilter = Parameters<typeof DTP.findOne>[0];

export interface CreateTenderInput {
  packageId: string;
  estimatedAmount?: number | string | null;
  contractPrice?: number | string | null;
  [k: string]: unknown;
}

/**
 * Create a tender + backfill estimatedAmount from DTP + auto-mark small
 * Approval as Not Required. Extracted from the route so jobs/tests can reuse it.
 */
export async function createTender(input: CreateTenderInput) {
  const body: Record<string, unknown> = { ...input };
  if (body.estimatedAmount === undefined || body.estimatedAmount === null || body.estimatedAmount === '') {
    // tsId is an ObjectId ref; the validated packageId string casts cleanly at runtime.
    const dtp = await DTP.findOne({ tsId: String(body.packageId) } as unknown as DtpFilter).lean();
    if (dtp?.tenderAmount) body.estimatedAmount = Number(dtp.tenderAmount);
  }
  const tender = await Tender.create(body as Partial<ITender>);
  const tenderAmt =
    tender.estimatedAmount !== undefined && tender.estimatedAmount !== null
      ? Number(tender.estimatedAmount)
      : Number(tender.contractPrice || 0);
  if (tenderAmt > 0 && tenderAmt < 5000000) {
    await Approval.findOneAndUpdate(
      { tenderId: tender._id } as never,
      { $set: { notRequired: true } },
      { upsert: true, new: true },
    );
  }
  return tender;
}
