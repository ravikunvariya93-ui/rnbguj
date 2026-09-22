import type { ListPageSearchParams } from './types';
import { getPagination as getSharedPagination } from './api/validation';
import type { QueryFilter, Types } from 'mongoose';
import type { IApprovedWork } from '@/models/ApprovedWork';
import type { IPackage } from '@/models/Package';
import type { ITechnicalSanction } from '@/models/TechnicalSanction';
import type { ITender } from '@/models/Tender';

export async function buildDashboardFilter(params: ListPageSearchParams): Promise<{
    packageIds?: Types.ObjectId[];
    tenderIds?: Types.ObjectId[];
    hasFilter: boolean;
}> {
    const metadataFiltersArr: Record<string, unknown>[] = [];
    if (params.estimateConsultant) metadataFiltersArr.push({ estimateConsultant: params.estimateConsultant });
    if (params.approvalYear) metadataFiltersArr.push({ approvalYear: params.approvalYear });
    if (params.roadCategory) metadataFiltersArr.push({ roadCategory: params.roadCategory });
    if (params.workType) {
        const types = params.workType.split(',').map(t => t.trim()).filter(Boolean);
        if (types.length > 0) {
            metadataFiltersArr.push({ workType: { $in: types } });
        }
    }
    if (params.schemeName) metadataFiltersArr.push({ schemeName: params.schemeName });
    if (params.natureOfWork) {
        if (params.natureOfWork === 'Unclassified') {
            metadataFiltersArr.push({ $or: [{ natureOfWork: { $exists: false } }, { natureOfWork: null }, { natureOfWork: '' }] });
        } else {
            metadataFiltersArr.push({ natureOfWork: params.natureOfWork });
        }
    }

    if (metadataFiltersArr.length > 0 || params.subDivision) {
        let validWorkNames: string[] = [];
        let tsIds: Types.ObjectId[] = [];
        
        if (metadataFiltersArr.length > 0) {
            const { default: ApprovedWork } = await import('@/models/ApprovedWork');
            const workQuery: Record<string, unknown> = metadataFiltersArr.length > 1 ? { $and: metadataFiltersArr } : metadataFiltersArr[0];
            const matchingWorks = await ApprovedWork.find(workQuery as unknown as QueryFilter<IApprovedWork>).select('workName').lean();
            validWorkNames = matchingWorks.map((w) => w.workName);
            
            const { default: TechnicalSanction } = await import('@/models/TechnicalSanction');
            const matchingTS = await TechnicalSanction.find({ workName: { $in: validWorkNames } } as unknown as QueryFilter<ITechnicalSanction>).select('_id').lean();
            tsIds = matchingTS.map((ts) => ts._id);
        }

        const { default: Package } = await import('@/models/Package');
        const pkgQuery: Record<string, unknown> = {};
        if (params.subDivision) pkgQuery.subDivision = params.subDivision;
        if (metadataFiltersArr.length > 0) {
            const orConditions: Record<string, unknown>[] = [
                { "works.workName": { $in: validWorkNames } },
                { "works.workId": { $in: tsIds } }
            ];
            if (params.workType) {
                const types = params.workType.split(',').map(t => t.trim()).filter(Boolean);
                if (types.length > 0) {
                    orConditions.push({ workType: { $in: types } });
                }
            }
            pkgQuery.$or = orConditions;
        }
        
        const matchingPkgs = await Package.find(pkgQuery as unknown as QueryFilter<IPackage>).select('_id').lean();
        const packageIds = matchingPkgs.map((p) => p._id);

        const { default: Tender } = await import('@/models/Tender');
        const matchingTenders = await Tender.find({ packageId: { $in: packageIds } } as unknown as QueryFilter<ITender>).select('_id').lean();
        const tenderIds = matchingTenders.map((t) => t._id);

        return { packageIds, tenderIds, hasFilter: true };
    }

    return { hasFilter: false };
}

export function parsePagination(params: { page?: string; limit?: string }): {
    page: number;
    limit: number;
    skip: number;
} {
    // Delegate to the shared capped implementation; keep this wrapper so
    // existing callers don't need to change.
    const fakeUrl = `http://localhost/?page=${params.page || '1'}&limit=${params.limit || '100'}`;
    return getSharedPagination(fakeUrl);
}

const ALLOWED_SORT_FIELDS = new Set([
    'createdAt', 'updatedAt', 'billDate', 'grossAmount', 'netPaidAmount',
    'name', 'workName', 'packageName', 'username', 'role',
]);

export function parseSort(
    params: { sort?: string; order?: string },
    defaultSort: Record<string, 1 | -1> = { createdAt: -1 }
): Record<string, 1 | -1> {
    let sortObj = defaultSort;
    if (params.sort && params.order && ALLOWED_SORT_FIELDS.has(params.sort)) {
        sortObj = { [params.sort]: params.order === 'asc' ? 1 : -1 };
    }
    return sortObj;
}
