import Tender from '@/models/Tender';
import Approval from '@/models/Approval';
import DTP from '@/models/DTP';

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
    const dtp = (await DTP.findOne({ tsId: body.packageId } as any).lean()) as any;
    if (dtp?.tenderAmount) body.estimatedAmount = Number(dtp.tenderAmount);
  }
  const tender = await Tender.create(body);
  const tenderAmt =
    tender.estimatedAmount !== undefined && tender.estimatedAmount !== null
      ? Number(tender.estimatedAmount)
      : Number((tender as unknown as { contractPrice?: unknown }).contractPrice || 0);
  if (tenderAmt > 0 && tenderAmt < 5000000) {
    await Approval.findOneAndUpdate(
      { tenderId: tender._id } as never,
      { $set: { notRequired: true } },
      { upsert: true, new: true },
    );
  }
  return tender;
}
