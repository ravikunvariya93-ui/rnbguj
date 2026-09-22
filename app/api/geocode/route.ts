import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Village from '@/models/Village';

export interface GeoCandidate {
    lat: number;
    lng: number;
    address: string;
}

interface GoogleGeocodeResult {
    geometry?: { location?: { lat?: unknown; lng?: unknown } };
    formatted_address?: string;
    address_components?: { long_name?: string }[];
}

interface VillageDoc {
    lat: number;
    lng: number;
    address?: string;
    source?: string;
}

async function googleResults(query: string, apiKey: string): Promise<GoogleGeocodeResult[]> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&components=country:IN&key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json() as { status?: string; results?: GoogleGeocodeResult[] };
    if (data.status !== 'OK' || !Array.isArray(data.results)) return [];
    return data.results;
}

function toCandidate(r: GoogleGeocodeResult): GeoCandidate | null {
    const loc = r?.geometry?.location;
    if (typeof loc?.lat !== 'number' || typeof loc?.lng !== 'number') return null;
    return { lat: loc.lat, lng: loc.lng, address: r.formatted_address || '' };
}

// A result is trusted only if the village name is in the address AND the
// district/taluka components corroborate the context (or Bhavnagar). This
// rejects both taluka-center fallbacks and same-named villages in far
// districts (e.g. Bordi, Kheda instead of Bordi, Bhavnagar).
function isTrustedHit(r: GoogleGeocodeResult, firstWord: string, context: string): boolean {
    const addr = (r?.formatted_address || '').toLowerCase();
    if (!addr.includes(firstWord.toLowerCase())) return false;
    const areas: string[] = Array.isArray(r?.address_components)
        ? r.address_components.map((c: { long_name?: string }) => String(c?.long_name || '').toLowerCase())
        : [];
    const wants = [context.toLowerCase(), 'bhavnagar'].filter(Boolean);
    return wants.some((w) => addr.includes(w) || areas.some((a) => a.includes(w)));
}

export async function GET(request: Request) {
    try {
        await dbConnect();
        const { searchParams } = new URL(request.url);
        const village = (searchParams.get('village') || '').trim();
        const context = (searchParams.get('context') || '').trim();
        if (!village) {
            return NextResponse.json({ success: false, error: 'village is required' }, { status: 400 });
        }

        const key = `${village}|${context}`.toLowerCase();

        // 1. Saved / verified location wins.
        const saved = await Village.findOne({ key }).lean();
        if (saved) {
            return NextResponse.json({
                success: true,
                data: { lat: saved.lat, lng: saved.lng, address: saved.address, source: saved.source },
            });
        }
        // Same village saved under a different context (prefer Bhavnagar ones).
        const sameName = await Village.find({ name: new RegExp(`^${village.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }).lean();
        if (sameName.length > 0) {
            const preferred = sameName.find((v: VillageDoc) => (v.address || '').toLowerCase().includes('bhavnagar')) || sameName[0];
            return NextResponse.json({
                success: true,
                data: { lat: preferred.lat, lng: preferred.lng, address: preferred.address, source: preferred.source },
            });
        }

        const apiKey = process.env.GOOGLE_MAPS_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ success: false, error: 'geocoding not configured' }, { status: 500 });
        }

        // 2. Live Google lookup (Bhavnagar-biased query variants).
        const firstWord = village.split(/\s+/)[0];
        const queries: string[] = [];
        for (const n of [village, firstWord]) {
            if (!n) continue;
            const cands = context
                ? [`${n}, ${context}, Bhavnagar, Gujarat, India`, `${n}, Bhavnagar, Gujarat, India`]
                : [`${n}, Bhavnagar, Gujarat, India`];
            for (const c of cands) {
                if (!queries.includes(c)) queries.push(c);
            }
        }

        const seen = new Set<string>();
        const candidates: GeoCandidate[] = [];
        for (const q of queries) {
            const results = await googleResults(q, apiKey);
            for (const r of results.slice(0, 3)) {
                const c = toCandidate(r);
                if (!c) continue;
                if (!c.address.toLowerCase().includes(firstWord.toLowerCase())) continue;
                const dedupe = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
                if (seen.has(dedupe)) continue;
                seen.add(dedupe);
                if (isTrustedHit(r, firstWord, context)) {
                    await Village.findOneAndUpdate(
                        { key },
                        { key, name: village, context, lat: c.lat, lng: c.lng, address: c.address, source: 'google' },
                        { upsert: true, new: true }
                    );
                    return NextResponse.json({ success: true, data: { ...c, source: 'google' } });
                }
                candidates.push(c);
                if (candidates.length >= 8) break;
            }
            if (candidates.length >= 8) break;
        }

        return NextResponse.json({ success: false, error: 'not found', candidates }, { status: 404 });
    } catch (error: unknown) {
        return NextResponse.json({ success: false, error: error instanceof Error && error.message ? error.message : 'geocode failed' }, { status: 500 });
    }
}
