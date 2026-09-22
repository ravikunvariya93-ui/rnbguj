import '@/models/Package';
import '@/models/TechnicalSanction';
import Tender from '@/models/Tender';
import { withApi } from '@/lib/api/handler';
import { created, paginated, badRequest } from '@/lib/api/response';
import { getPagination, isObjectId } from '@/lib/api/validation';
import { createTender } from '@/lib/services/tenderService';

export const POST = withApi(async (_ctx, request: Request) => {
    const body = await request.json();

    if (!body.packageId || !isObjectId(String(body.packageId))) {
        return badRequest('Valid Package ID is required');
    }
    const tender = await createTender(body);
    return created(tender);
});

export const GET = withApi(async (_ctx, request: Request) => {
        const { searchParams } = new URL(request.url);
        const includeId = searchParams.get('includeId');
        const { page, limit, skip } = getPagination(request.url);

        const total = await Tender.countDocuments({});

        const tenders = await Tender.find({})
            .select('tenderId packageName packageId trialNo contractorName tenderNoticeYear noticeNo srNo cancelled cancellationReason aboveBelowPercentage aboveBelowInWord contractPrice')
            .populate({ path: 'packageId', select: 'packageName works' })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();
        
        // Group by packageId and keep the one with the highest trialNo
        const packageMap = new Map<string, { trialNo?: number; _id: { toString(): string } }>();
        for (const tender of tenders) {
            const pkg = tender.packageId as unknown as { _id?: { toString(): string } } | null | undefined;
            const pkgId = pkg?._id?.toString() || pkg?.toString();
            if (!pkgId) {
                // If there's no packageId, keep it as is
                packageMap.set(`no-pkg-${tender._id}`, tender);
                continue;
            }
            const existing = packageMap.get(pkgId);
            if (!existing) {
                packageMap.set(pkgId, tender);
            } else {
                const existingTrial = existing.trialNo || 1;
                const currentTrial = tender.trialNo || 1;
                if (currentTrial > existingTrial) {
                    packageMap.set(pkgId, tender);
                }
            }
        }

        const filteredTenders = Array.from(packageMap.values());

        // If includeId is specified and not present in the filtered list, append it
        if (includeId && isObjectId(includeId)) {
            const isAlreadyIncluded = filteredTenders.some(t => t._id.toString() === includeId);
            if (!isAlreadyIncluded) {
                const extraTender = await Tender.findById(includeId).populate('packageId');
                if (extraTender) {
                    filteredTenders.push(extraTender);
                }
            }
        }

        return paginated(filteredTenders, total, page, limit);
});
