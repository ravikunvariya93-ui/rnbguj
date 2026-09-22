import { NextResponse } from 'next/server';

// Server-side proxy for Google Places API (New): autocomplete + details.
// Keeps GOOGLE_MAPS_API_KEY off the client. Requires "Places API" enabled.
//
// GET /api/places?q=pachhe&context=Talaja  -> live suggestions
// GET /api/places?place_id=XXXX            -> { lat, lng, address }

export interface PlaceSuggestion {
    placeId: string;
    mainText: string;
    secondaryText: string;
}

export async function GET(request: Request) {
    try {
        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'geocoding not configured' }, { status: 500 });
        }
        const { searchParams } = new URL(request.url);
        const placeId = (searchParams.get('place_id') || '').trim();

        // --- Place Details: resolve a suggestion to coordinates ---
        if (placeId) {
            const id = placeId.replace(/^places\//, '');
            const res = await fetch(
                `https://places.googleapis.com/v1/places/${encodeURIComponent(id)}?fields=location,formattedAddress`,
                { headers: { 'X-Goog-Api-Key': apiKey } }
            );
            const data = await res.json().catch(() => null);
            const loc = data?.location;
            if (!res.ok || typeof loc?.latitude !== 'number' || typeof loc?.longitude !== 'number') {
                return NextResponse.json(
                    { success: false, error: data?.error?.message || 'place lookup failed' },
                    { status: 502 }
                );
            }
            return NextResponse.json({
                success: true,
                data: { lat: loc.latitude, lng: loc.longitude, address: data.formattedAddress || '' },
            });
        }

        // --- Autocomplete: live suggestions as the user types ---
        const q = (searchParams.get('q') || '').trim();
        const context = (searchParams.get('context') || '').trim();
        if (q.length < 2) {
            return NextResponse.json({ success: true, data: [] });
        }
        // Query twice: context-qualified first, then the bare query. The bare
        // query catches villages the qualified input misses (and vice versa).
        const inputs = context ? [`${q}, ${context}, Bhavnagar`, q] : [q, `${q}, Bhavnagar`];
        const seen = new Set<string>();
        const suggestions: PlaceSuggestion[] = [];
        for (const input of inputs) {
            const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Goog-Api-Key': apiKey,
                    'X-Goog-FieldMask': 'suggestions.placePrediction.place,suggestions.placePrediction.text',
                },
                body: JSON.stringify({ input, includedRegionCodes: ['in'] }),
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
                // Surface auth/config errors; empty results are fine.
                if (data?.error?.code === 403 || data?.error?.status === 'PERMISSION_DENIED') {
                    return NextResponse.json(
                        { success: false, error: data?.error?.message || 'Places API denied' },
                        { status: 502 }
                    );
                }
                continue;
            }
            for (const s of data?.suggestions || []) {
                const p = s?.placePrediction || {};
                const placeId = String(p?.place || '').replace(/^places\//, '');
                const full: string = p?.text?.text || '';
                if (!placeId || !full || seen.has(placeId)) continue;
                seen.add(placeId);
                const parts = full.split(',').map((x: string) => x.trim()).filter(Boolean);
                suggestions.push({
                    placeId,
                    mainText: parts[0] || full,
                    secondaryText: parts.slice(1).join(', '),
                });
                if (suggestions.length >= 8) break;
            }
            if (suggestions.length >= 8) break;
        }
        return NextResponse.json({ success: true, data: suggestions });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error && error.message ? error.message : 'search failed' }, { status: 500 });
    }
}
