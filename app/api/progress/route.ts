import ProgressEntry from '@/models/ProgressEntry';
import { withApi } from '@/lib/api/handler';
import { created, paginated, badRequest } from '@/lib/api/response';
import { getPagination } from '@/lib/api/validation';
import { PROGRESS_WRITE_ROLES } from '@/lib/roles';
import { isValidObjectId } from 'mongoose';

// GET /api/progress?packageId=... — entries newest-first
export const GET = withApi(async (_ctx, request: Request) => {
    const url = new URL(request.url);
    const packageId = url.searchParams.get('packageId') || '';
    if (!packageId || !isValidObjectId(packageId)) {
        return badRequest('Valid packageId is required');
    }
    const { page, limit, skip } = getPagination(request.url);
    const filter = { packageId: packageId as any };
    const total = await ProgressEntry.countDocuments(filter);
    const entries = await ProgressEntry.find(filter).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).lean();
    return paginated(entries, total, page, limit);
});

// POST /api/progress — AAE/DEE and office roles only
export const POST = withApi(
    async (ctx, request: Request) => {
        const body = await request.json();
        const packageId = String(body?.packageId || '');
        const workName = String(body?.workName || '').trim();
        const percent = Number(body?.physicalPercent);
        if (!packageId || !isValidObjectId(packageId)) return badRequest('Valid packageId is required');
        if (!workName) return badRequest('Work name is required');
        if (!body?.date || isNaN(new Date(body.date).getTime())) return badRequest('Valid date is required');
        if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
            return badRequest('Physical progress must be 0–100');
        }
        const photos = Array.isArray(body?.photos)
            ? body.photos
                  .filter((p: any) => p && typeof p.url === 'string' && p.url)
                  .slice(0, 20)
                  .map((p: any) => ({
                      url: String(p.url),
                      fileName: String(p.fileName || ''),
                      lat: Number.isFinite(Number(p.lat)) ? Number(p.lat) : undefined,
                      lng: Number.isFinite(Number(p.lng)) ? Number(p.lng) : undefined,
                      takenAt: p.takenAt && !isNaN(new Date(p.takenAt).getTime()) ? new Date(p.takenAt) : undefined,
                  }))
            : [];
        const entry = await ProgressEntry.create({
            packageId: packageId as any,
            workName,
            date: new Date(body.date),
            physicalPercent: percent,
            chainageFrom: String(body?.chainageFrom || ''),
            chainageTo: String(body?.chainageTo || ''),
            remarks: String(body?.remarks || ''),
            authorName: String(body?.authorName || ctx.session?.user?.name || '').trim(),
            authorRole: String(body?.authorRole || (ctx.session?.user as any)?.role || ''),
            createdBy: (ctx.session?.user as any)?.id,
            photos,
        });
        return created(entry);
    },
    { roles: PROGRESS_WRITE_ROLES }
);
