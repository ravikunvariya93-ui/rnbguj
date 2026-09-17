import LOA from '@/models/LOA';
import Tender from '@/models/Tender';
import { withApi } from '@/lib/api/handler';
import { created, paginated, badRequest } from '@/lib/api/response';
import { getPagination, isObjectId, sanitizeUpdate } from '@/lib/api/validation';

// Ensure Tender model is registered for populate
void Tender;

export const POST = withApi(async (_ctx, req: Request) => {
    const body = await req.json();
    if (body?.tenderId && !isObjectId(String(body.tenderId))) {
        return badRequest('Invalid tenderId');
    }
    const loa = await LOA.create(sanitizeUpdate(body));
    return created(loa);
});

export const GET = withApi(async (_ctx, request: Request) => {
    const { page, limit, skip } = getPagination(request.url);
    const total = await LOA.countDocuments({});
    const loas = await LOA.find({}).populate('tenderId').sort({ createdAt: -1 }).skip(skip).limit(limit).lean();
    return paginated(loas, total, page, limit);
});
