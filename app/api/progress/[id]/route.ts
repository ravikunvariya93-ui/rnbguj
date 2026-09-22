import ProgressEntry from '@/models/ProgressEntry';
import { withApi } from '@/lib/api/handler';
import { ok, badRequest, notFound } from '@/lib/api/response';
import { PROGRESS_DELETE_ROLES } from '@/lib/roles';
import { isValidObjectId } from 'mongoose';

// DELETE /api/progress/[id] — ADMIN/SUPERVISOR only
export const DELETE = withApi(
    async (_ctx, _request: Request, { params }: { params: Promise<{ id: string }> }) => {
        const { id } = await params;
        if (!id || !isValidObjectId(id)) return badRequest('Valid id is required');
        const deleted = await ProgressEntry.findByIdAndDelete(id);
        if (!deleted) return notFound('Progress entry not found');
        return ok({ deleted: true });
    },
    { roles: PROGRESS_DELETE_ROLES }
);
