import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Village from '@/models/Village';

// Save (or correct) a village location picked by the user.
// Body: { village, context?, lat, lng, address?, source? }
export async function POST(request: Request) {
    try {
        await dbConnect();
        const body = await request.json();
        const village = String(body?.village || '').trim();
        const context = String(body?.context || '').trim();
        const lat = Number(body?.lat);
        const lng = Number(body?.lng);
        if (!village) {
            return NextResponse.json({ success: false, error: 'village is required' }, { status: 400 });
        }
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
            return NextResponse.json({ success: false, error: 'valid lat/lng required' }, { status: 400 });
        }
        const key = `${village}|${context}`.toLowerCase();
        const doc = await Village.findOneAndUpdate(
            { key },
            {
                key,
                name: village,
                context,
                lat,
                lng,
                address: String(body?.address || ''),
                // User-picked locations are always verified, even when chosen from Google candidates.
                source: 'manual',
            },
            { upsert: true, new: true }
        );
        return NextResponse.json({ success: true, data: doc }, { status: 201 });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error && error.message ? error.message : 'save failed' }, { status: 500 });
    }
}
