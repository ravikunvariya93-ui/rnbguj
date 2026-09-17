import Agency from '@/models/Agency';
import { withApi } from '@/lib/api/handler';
import { created, ok } from '@/lib/api/response';
import { badRequest } from '@/lib/api/response';

export const GET = withApi(async () => {
    const agencies = await Agency.find({}).sort({ name: 1 }).lean();
    return ok(agencies);
});

export const POST = withApi(async (_ctx, request: Request) => {
    const body = await request.json();
    if (!body?.name || !String(body.name).trim()) {
        return badRequest('Contractor name is required');
    }
    try {
        const agency = await Agency.create({ ...body, name: String(body.name).trim() });
        return created(agency);
    } catch (error: unknown) {
        if ((error as { code?: number }).code === 11000) {
            return badRequest('A contractor with this name already exists.');
        }
        throw error;
    }
});
