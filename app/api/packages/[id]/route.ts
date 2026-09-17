import Package from '@/models/Package';
import { parseDateStr } from '@/lib/dateUtils';
import { withApi } from '@/lib/api/handler';
import { ok, badRequest, notFound } from '@/lib/api/response';
import { isObjectId, sanitizeUpdate } from '@/lib/api/validation';
import { deletePackageCascade } from '@/lib/services/packageService';

type Ctx = { params: Promise<{ id: string }> };

export const GET = withApi(async (_ctx, _request: Request, { params }: Ctx) => {
    const { id } = await params;
    if (!isObjectId(id)) return badRequest('Invalid package id');
    const pkg = await Package.findById(id);
    if (!pkg) return notFound('Package not found');
    return ok(pkg);
});

export const PUT = withApi(async (_ctx, request: Request, { params }: Ctx) => {
    const { id } = await params;
    if (!isObjectId(id)) return badRequest('Invalid package id');
    const body = await request.json();
    const clean = sanitizeUpdate(body);
    if (clean.committeeDate !== undefined) {
        clean.committeeDate = clean.committeeDate ? parseDateStr(clean.committeeDate as string) : null;
    }
    const pkg = await Package.findByIdAndUpdate(id, clean, { new: true, runValidators: true });
    if (!pkg) return notFound('Package not found');
    return ok(pkg);
});

export const DELETE = withApi(
    async (_ctx, _request: Request, { params }: Ctx) => {
        const { id } = await params;
        if (!isObjectId(id)) return badRequest('Invalid package id');
        const deletedPkg = await deletePackageCascade(id);
        if (!deletedPkg) return notFound('Package not found');
        return ok({});
    },
    { roles: ['ADMIN', 'SUPERVISOR'] },
);
