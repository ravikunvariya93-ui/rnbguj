import type { ListPageSearchParams } from './types';

export async function buildDashboardFilter(params: ListPageSearchParams): Promise<{
    packageIds?: any[];
    tenderIds?: any[];
    hasFilter: boolean;
}> {
    const metadataFiltersArr: any = [];
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
        let tsIds: any[] = [];
        
        if (metadataFiltersArr.length > 0) {
            const { default: ApprovedWork } = await import('@/models/ApprovedWork');
            const workQuery = metadataFiltersArr.length > 1 ? { $and: metadataFiltersArr } : metadataFiltersArr[0];
            const matchingWorks = await ApprovedWork.find(workQuery).select('workName').lean();
            validWorkNames = matchingWorks.map((w: any) => w.workName);
            
            const { default: TechnicalSanction } = await import('@/models/TechnicalSanction');
            const matchingTS = await TechnicalSanction.find({ workName: { $in: validWorkNames } }).select('_id').lean();
            tsIds = matchingTS.map((ts: any) => ts._id);
        }

        const { default: Package } = await import('@/models/Package');
        let pkgQuery: any = {};
        if (params.subDivision) pkgQuery.subDivision = params.subDivision;
        if (metadataFiltersArr.length > 0) {
            const orConditions: any[] = [
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
        
        const matchingPkgs = await Package.find(pkgQuery).select('_id').lean();
        const packageIds = matchingPkgs.map((p: any) => p._id);

        const { default: Tender } = await import('@/models/Tender');
        const matchingTenders = await Tender.find({ packageId: { $in: packageIds } }).select('_id').lean();
        const tenderIds = matchingTenders.map((t: any) => t._id);

        return { packageIds, tenderIds, hasFilter: true };
    }

    return { hasFilter: false };
}

export function parsePagination(params: { page?: string; limit?: string }): {
    page: number;
    limit: number;
    skip: number;
} {
    const page = parseInt(params.page || '1');
    const limit = parseInt(params.limit || '100');
    const skip = (page - 1) * limit;
    return { page, limit, skip };
}

export function parseSort(
    params: { sort?: string; order?: string },
    defaultSort: Record<string, 1 | -1> = { createdAt: -1 }
): Record<string, 1 | -1> {
    let sortObj = defaultSort;
    if (params.sort && params.order) {
        sortObj = { [params.sort]: params.order === 'asc' ? 1 : -1 };
    }
    return sortObj;
}
