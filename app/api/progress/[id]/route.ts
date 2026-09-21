import ProgressEntry from '@/models/ProgressEntry';
import { withApi } from '@/lib/api/handler';
import { ok, badRequest, notFound } from '@/lib/api/response';
import { PROGRESS_DELETE_ROLES } from '@/lib/roles';
import { isValidObjectId } from 'mongoose';

// DELETE /api/progress/[id] — ADMIN/SUPERVISOR only
export const DELETE = withApi(
    async (_ctx, _request: Request, routeCtx?: { params: { id: string } | Promise<{ id: string }> }) => {
        const params = routeCtx?.params ? await routeCtx.params : undefined;
        const id = params?.id || '';
        if (!id || !isValidObjectId(id)) return badRequest('Valid id is required');
        const deleted = await ProgressEntry.findByIdAndDelete(id);
        if (!deleted) return notFound('Progress entry not found');
        return ok({ deleted: true });
    },
    { roles: PROGRESS_DELETE_ROLES }
);
