import Package from '@/models/Package';
import { parseDateStr } from '@/lib/dateUtils';
import { withApi } from '@/lib/api/handler';
import { created, paginated, badRequest } from '@/lib/api/response';
import { getPagination, sanitizeUpdate } from '@/lib/api/validation';

export const POST = withApi(async (_ctx, request: Request) => {
    const body = await request.json();
    if (!body?.packageName || !String(body.packageName).trim()) {
        return badRequest('Package name is required');
    }
    const clean = sanitizeUpdate(body);
    if (clean.committeeDate !== undefined) {
        clean.committeeDate = clean.committeeDate ? parseDateStr(clean.committeeDate as string) : null;
    }
    const pkg = await Package.create(clean);
    return created(pkg);
});

export const GET = withApi(async (_ctx, request: Request) => {
    const { page, limit, skip } = getPagination(request.url);
    const total = await Package.countDocuments({});
    const packages = await Package.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    return paginated(packages, total, page, limit);
});
