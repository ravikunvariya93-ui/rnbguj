'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import VillagePicker, { type GeoCandidate, type NearRef } from './VillagePicker';

export interface WorkRoute {
    workName: string;
    villages: string[];
    coords: ([number, number] | null)[];
    candidates: Record<string, GeoCandidate[]>;
    status: 'pending' | 'ok' | 'partial' | 'not-found';
}

const ROUTE_COLORS = ['#059669', '#2563eb', '#dc2626', '#d97706', '#7c3aed', '#db2777', '#0891b2'];
const JUNK_TOKENS = /^(stetion|section|station|area|no)$/i;

function toTitle(s: string): string {
    return s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Parse a work name into an ordered list of village names.
 * Handles: "A B ROAD", "A to B Road", "A B C Road", "X Approach Road",
 * chainages ("Ch.1/080", "0/480"), "(Sec ...)" tails, and
 * "Construction of ... at Village X Taluka: Y" building works.
 */
export function parseWorkRoute(raw: string): string[] {
    if (!raw) return [];
    let text = String(raw).replace(/\s+/g, ' ').trim();
    if (!text) return [];

    // Building / CD works carry the village explicitly: "... at Village X Taluka ..."
    const vm = text.match(/at Village\s+([A-Za-z][A-Za-z0-9.\- ]*?)(?=\s+(Taluka|Ta\.|Dist|District|\)|$))/i);
    if (vm) {
        const v = vm[1].replace(/[.\-]+$/g, '').trim();
        return v ? [toTitle(v)] : [];
    }

    text = text.replace(/\([^)]*\)/g, ' ');          // "(NPBT)", "(Sec. 0/00-3/2)", ...
    text = text.replace(/\bsection\b.*$/i, ' ');     // "section 3/200 to 4/200" tails
    text = text.replace(/\b(ch|km)\.?\s*\d[\d/]*/gi, ' '); // "Ch.1/080"
    text = text.replace(/\b\d+\/\d+\b/g, ' ');       // "0/480", "2/900"
    text = text.replace(/\bno\.?\s*\d+\b/gi, ' ');   // "NO 1"
    text = text.replace(/-(\d+)\b/g, ' $1');         // "JAMVADI-2" -> "JAMVADI 2"
    text = text.replace(/\b(roads?|approach|approch|aproch)\b/gi, ' ');
    text = text.replace(/\s+/g, ' ').trim();
    if (!text) return [];

    const cleanSeg = (seg: string): string =>
        seg.split(/\s+/)
            .map((t) => t.replace(/[.,;:()\-/]+$/g, '').trim())
            .filter((t) => t && !/^\d+$/.test(t) && !/^[.,;:()\-/]+$/.test(t) && !JUNK_TOKENS.test(t))
            .join(' ');

    // "A to B" style: each side is one endpoint (may be multi-word, e.g. "BHUNDARKHA 1")
    const toParts = text.split(/\s+to\s+/i).map((p) => p.trim()).filter(Boolean);
    if (toParts.length > 1) {
        return toParts.map((p) => toTitle(cleanSeg(p))).filter(Boolean);
    }

    // Otherwise every remaining token is a village in route order ("JESAR DEPLA RANIGAM")
    return text.split(/\s+/)
        .map((t) => t.replace(/[.,;:()\-/]+$/g, '').trim())
        .filter((t) => t && !/^\d+$/.test(t) && !/^[.,;:()\-/]+$/.test(t) && !JUNK_TOKENS.test(t))
        .map(toTitle);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// In-memory cache so re-renders / revisits never refetch.
const geoCache = new Map<string, [number, number] | null>();

export function clearVillageCache(name: string, context: string) {
    geoCache.delete(`${name}|${context}`.toLowerCase());
}

async function geocodeVillage(
    name: string,
    context: string
): Promise<{ coord: [number, number] | null; candidates: GeoCandidate[] }> {
    const key = `${name}|${context}`.toLowerCase();
    if (geoCache.has(key)) {
        return { coord: geoCache.get(key) ?? null, candidates: [] };
    }
    try {
        const params = new URLSearchParams({ village: name });
        if (context) params.set('context', context);
        const res = await fetch(`/api/geocode?${params.toString()}`, { headers: { Accept: 'application/json' } });
        const body = await res.json().catch(() => null);
        if (res.ok && body?.success) {
            const d = body.data;
            if (typeof d?.lat === 'number' && typeof d?.lng === 'number') {
                const coord: [number, number] = [d.lat, d.lng];
                geoCache.set(key, coord);
                await sleep(200);
                return { coord, candidates: [] };
            }
        }
        if (res.status === 404 && Array.isArray(body?.candidates)) {
            return { coord: null, candidates: body.candidates };
        }
    } catch {
        // fall through to cache-null
    }
    geoCache.set(key, null);
    return { coord: null, candidates: [] };
}

interface WorksMapProps {
    works: string[];
    subDivision?: string;
}

export default function WorksMap({ works, subDivision }: WorksMapProps) {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapObj = useRef<L.Map | null>(null);
    const [routes, setRoutes] = useState<WorkRoute[]>([]);
    const [locating, setLocating] = useState(false);
    const [picker, setPicker] = useState<{ village: string; candidates: GeoCandidate[]; near: NearRef | null } | null>(null);
    const context = (subDivision || '').trim();

    const locateAll = async (workList: string[], ctx: string, cancelledRef: { cancelled: boolean }) => {
        const parsed = workList.map((w) => ({
            workName: w,
            villages: parseWorkRoute(w),
        }));
        setRoutes(parsed.map((p) => ({ ...p, coords: [], candidates: {}, status: 'pending' as const })));
        if (parsed.length === 0) return;
        setLocating(true);
        for (const p of parsed) {
            const coords: ([number, number] | null)[] = [];
            const candidates: Record<string, GeoCandidate[]> = {};
            for (const v of p.villages) {
                const { coord, candidates: cands } = await geocodeVillage(v, ctx);
                if (cancelledRef.cancelled) return;
                coords.push(coord);
                if (!coord && cands.length > 0) candidates[v] = cands;
            }
            const found = coords.filter(Boolean).length;
            const route: WorkRoute = {
                ...p,
                coords,
                candidates,
                status: found === 0 ? 'not-found' : found < p.villages.length ? 'partial' : 'ok',
            };
            if (!cancelledRef.cancelled) {
                setRoutes((prev) => prev.map((r) => (r.workName === p.workName ? route : r)));
            }
        }
        if (!cancelledRef.cancelled) setLocating(false);
    };

    // Parse + geocode whenever the work list changes.
    useEffect(() => {
        const ref = { cancelled: false };
        locateAll(works, context, ref);
        return () => { ref.cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [works.join('|'), context]);

    // Render Leaflet map from resolved routes.
    useEffect(() => {
        if (!mapRef.current) return;
        const allCoords = routes.flatMap((r) => r.coords).filter((c): c is [number, number] => !!c);
        if (allCoords.length === 0) return;

        if (!mapObj.current) {
            mapObj.current = L.map(mapRef.current).setView(allCoords[0], 11);
            L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 19,
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
            }).addTo(mapObj.current);
        }
        const map = mapObj.current;
        // Clear previous route layers, keep tiles.
        map.eachLayer((layer) => {
            if (!(layer instanceof L.TileLayer)) map.removeLayer(layer);
        });

        const bounds = L.latLngBounds([]);
        routes.forEach((r, i) => {
            const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
            const labels = r.villages.length > 0 ? r.villages.join(' → ') : r.workName;
            const line = r.coords.filter((c): c is [number, number] => !!c);
            if (line.length >= 2) {
                L.polyline(line, { color, weight: 4, opacity: 0.85 })
                    .bindTooltip(`${r.workName}: ${labels}`, { sticky: true })
                    .addTo(map);
            }
            r.coords.forEach((c, j) => {
                if (!c) return;
                bounds.extend(c);
                L.circleMarker(c, {
                    radius: 7,
                    color: '#ffffff',
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 1,
                })
                    .bindTooltip(r.villages[j] || r.workName, { sticky: true })
                    .addTo(map);
            });
        });
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40] });

        return () => { /* keep map instance across route updates */ };
    }, [routes]);

    useEffect(() => () => { mapObj.current?.remove(); mapObj.current = null; }, []);

    const openPicker = (village: string, cands: GeoCandidate[]) => {
        // Reference point for "nearby" sorting: prefer a located village on the
        // same road (e.g. Khardi for Pachediyadhar), else any located village.
        let near: NearRef | null = null;
        const sameWork = routes.find((r) => r.villages.includes(village));
        if (sameWork) {
            const idx = sameWork.villages.findIndex((v, j) => v !== village && !!sameWork.coords[j]);
            if (idx >= 0 && sameWork.coords[idx]) {
                const [lat, lng] = sameWork.coords[idx] as [number, number];
                near = { lat, lng, label: sameWork.villages[idx] };
            }
        }
        if (!near) {
            outer: for (const r of routes) {
                for (let j = 0; j < r.villages.length; j++) {
                    if (r.coords[j]) {
                        const [lat, lng] = r.coords[j] as [number, number];
                        near = { lat, lng, label: r.villages[j] };
                        break outer;
                    }
                }
            }
        }
        setPicker({ village, candidates: cands, near });
    };

    const handleSaved = (village: string, lat: number, lng: number) => {
        clearVillageCache(village, context);
        setPicker(null);
        setRoutes((prev) =>
            prev.map((r) => {
                if (!r.villages.includes(village)) return r;
                const coords = r.villages.map((v, j) => (v === village ? ([lat, lng] as [number, number]) : r.coords[j]));
                const found = coords.filter(Boolean).length;
                return {
                    ...r,
                    coords,
                    status: found === 0 ? 'not-found' : found < r.villages.length ? 'partial' : 'ok',
                } as WorkRoute;
            })
        );
    };

    if (works.length === 0) {
        return <p className="text-sm text-slate-400 italic px-1 py-4 text-center">No works linked yet.</p>;
    }

    const anyLocated = routes.some((r) => r.coords.some(Boolean));

    return (
        <div className="space-y-3">
            {anyLocated ? (
                <div ref={mapRef} className="h-[380px] w-full rounded-xl border border-slate-200 z-0" />
            ) : (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                    {locating
                        ? 'Locating villages on the map…'
                        : 'Could not locate these villages on the map yet. Use “Select” below to place them.'}
                </div>
            )}
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {routes.map((r, i) => {
                    const color = ROUTE_COLORS[i % ROUTE_COLORS.length];
                    return (
                        <li key={r.workName} className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
                            <span
                                className="mt-1.5 h-3 w-3 flex-shrink-0 rounded-full border border-white shadow"
                                style={{ backgroundColor: color }}
                            />
                            <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800 break-words">{r.workName}</p>
                                {r.villages.length > 0 && (
                                    <div className="mt-1 flex flex-wrap gap-1">
                                        {r.villages.map((v, j) => {
                                            const placed = !!r.coords[j];
                                            return (
                                                <span
                                                    key={`${v}-${j}`}
                                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                                                        placed
                                                            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                                                            : 'border-amber-200 bg-amber-50 text-amber-800'
                                                    }`}
                                                >
                                                    <span title={placed ? 'On map' : 'Not located'}>{placed ? '●' : '○'}</span>
                                                    {v}
                                                    <button
                                                        type="button"
                                                        onClick={() => openPicker(v, r.candidates[v] || [])}
                                                        className="underline hover:no-underline cursor-pointer"
                                                        title={placed ? 'Change this village location' : 'Select this village location'}
                                                    >
                                                        {placed ? 'Change' : 'Select'}
                                                    </button>
                                                </span>
                                            );
                                        })}
                                    </div>
                                )}
                                <p className="mt-0.5 text-[11px] text-slate-400">
                                    {r.status === 'pending' || (locating && !r.coords.some(Boolean))
                                        ? 'Locating…'
                                        : r.status === 'ok'
                                            ? 'On map'
                                            : r.status === 'partial'
                                                ? 'Partially located — select missing villages'
                                                : 'Location not found — select villages'}
                                </p>
                            </div>
                        </li>
                    );
                })}
            </ul>
            <p className="text-[11px] text-slate-400 text-right">Map data © OpenStreetMap contributors</p>
            {picker && (
                <VillagePicker
                    village={picker.village}
                    context={context}
                    candidates={picker.candidates}
                    near={picker.near}
                    onClose={() => setPicker(null)}
                    onSaved={(lat, lng) => handleSaved(picker.village, lat, lng)}
                />
            )}
        </div>
    );
}
