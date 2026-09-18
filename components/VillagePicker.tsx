'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';

export interface GeoCandidate {
    lat: number;
    lng: number;
    address: string;
}

export interface NearRef {
    lat: number;
    lng: number;
    label: string;
}

interface VillagePickerProps {
    village: string;
    context: string;
    candidates: GeoCandidate[];
    near: NearRef | null;
    onSaved: (lat: number, lng: number) => void;
    onClose: () => void;
}

// Bhavnagar city fallback when nothing else is locatable.
const BHAVNAGAR_FALLBACK: [number, number] = [21.7645, 72.1519];

// District hint extracted from a geocode address, e.g. "…, Gujarat 388225, …".
function districtHint(address: string): string {
    const m = address.match(/,\s*([^,]+?)\s+\d{6}\b/);
    if (m) return m[1].trim();
    const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
    return parts.length >= 2 ? parts.slice(-3, -1).join(', ') : address;
}

function mergeCandidates(list: GeoCandidate[]): GeoCandidate[] {
    const seen = new Set<string>();
    return list.filter((c) => {
        const k = `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
    });
}

// Straight-line distance in km.
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
    const R = 6371;
    const dLat = ((bLat - aLat) * Math.PI) / 180;
    const dLng = ((bLng - aLng) * Math.PI) / 180;
    const s =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((aLat * Math.PI) / 180) *
            Math.cos((bLat * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.sqrt(s));
}

export default function VillagePicker({ village, context, candidates, near, onSaved, onClose }: VillagePickerProps) {
    const [allCandidates, setAllCandidates] = useState<GeoCandidate[]>(candidates);
    const [query, setQuery] = useState('');
    const [suggestions, setSuggestions] = useState<{ placeId: string; mainText: string; secondaryText: string }[]>([]);
    const [suggesting, setSuggesting] = useState(false);
    const [showSuggest, setShowSuggest] = useState(false);
    const [manual, setManual] = useState<{ lat: number; lng: number } | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [mapReady, setMapReady] = useState(false);

    const miniRef = useRef<HTMLDivElement>(null);
    const miniMap = useRef<L.Map | null>(null);
    const marker = useRef<L.Marker | null>(null);

    useEffect(() => {
        setAllCandidates(candidates);
    }, [candidates]);

    // Reference point for "nearby" sorting: located end of the same road if
    // given, else the taluka town (fetched here for the fallback).
    const [townCenter, setTownCenter] = useState<NearRef | null>(null);
    useEffect(() => {
        let cancelled = false;
        if (near || !context) return;
        (async () => {
            try {
                const res = await fetch(`/api/geocode?village=${encodeURIComponent(context)}`, {
                    headers: { Accept: 'application/json' },
                });
                const body = await res.json().catch(() => null);
                if (!cancelled && res.ok && body?.success) {
                    setTownCenter({ lat: body.data.lat, lng: body.data.lng, label: context });
                }
            } catch {
                // no fallback — list stays unsorted
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [near, context]);

    const refPoint = near ?? townCenter;

    const sortedCandidates = useMemo(() => {
        const withDist = allCandidates.map((c) => ({
            c,
            dist: refPoint ? distanceKm(refPoint.lat, refPoint.lng, c.lat, c.lng) : null as number | null,
        }));
        withDist.sort((a, b) => (a.dist ?? Infinity) - (b.dist ?? Infinity));
        return withDist;
    }, [allCandidates, refPoint]);

    // Live suggestions as the user types (Google Places Autocomplete via /api/places).
    useEffect(() => {
        const q = query.trim();
        if (q.length < 2) {
            setSuggestions([]);
            setSuggesting(false);
            return;
        }
        setSuggesting(true);
        const t = setTimeout(async () => {
            try {
                const params = new URLSearchParams({ q });
                if (context) params.set('context', context);
                const res = await fetch(`/api/places?${params.toString()}`, {
                    headers: { Accept: 'application/json' },
                });
                const body = await res.json().catch(() => null);
                if (!res.ok || !body?.success) throw new Error(body?.error || 'Search failed');
                setSuggestions(body.data || []);
                setShowSuggest(true);
            } catch (e: any) {
                setError(e?.message || 'Search failed');
                setSuggestions([]);
            } finally {
                setSuggesting(false);
            }
        }, 350);
        return () => clearTimeout(t);
    }, [query, context]);

    // Starting center: best candidate, else the taluka town, else Bhavnagar city.
    useEffect(() => {
        let cancelled = false;
        (async () => {
            let center: [number, number] | null =
                candidates.length > 0 ? [candidates[0].lat, candidates[0].lng] : null;
            if (!center && context) {
                try {
                    const res = await fetch(`/api/geocode?village=${encodeURIComponent(context)}`, {
                        headers: { Accept: 'application/json' },
                    });
                    const body = await res.json().catch(() => null);
                    if (!cancelled && res.ok && body?.success) {
                        center = [body.data.lat, body.data.lng];
                    }
                } catch {
                    // fall through to fallback
                }
            }
            if (!cancelled) {
                initMiniMap(center ?? BHAVNAGAR_FALLBACK);
                setMapReady(true);
            }
        })();
        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(
        () => () => {
            miniMap.current?.remove();
            miniMap.current = null;
            marker.current = null;
        },
        []
    );

    const placeMarker = (latlng: L.LatLng) => {
        const map = miniMap.current;
        if (!map) return;
        if (!marker.current) {
            marker.current = L.marker(latlng, { draggable: true }).addTo(map);
            marker.current.on('dragend', () => {
                const p = marker.current?.getLatLng();
                if (p) setManual({ lat: p.lat, lng: p.lng });
            });
        } else {
            marker.current.setLatLng(latlng);
        }
        setManual({ lat: latlng.lat, lng: latlng.lng });
    };

    const initMiniMap = (center: [number, number]) => {
        if (!miniRef.current || miniMap.current) return;
        const map = L.map(miniRef.current).setView(center, 12);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
        // Show known candidates as reference pins.
        candidates.forEach((c) => {
            L.circleMarker([c.lat, c.lng], {
                radius: 6,
                color: '#ffffff',
                weight: 2,
                fillColor: '#2563eb',
                fillOpacity: 1,
            })
                .bindTooltip(c.address, { sticky: true })
                .addTo(map);
        });
        map.on('click', (e: L.LeafletMouseEvent) => placeMarker(e.latlng));
        miniMap.current = map;
        // Modal layout settles after open — fix tile alignment.
        setTimeout(() => map.invalidateSize(), 300);
    };

    const pickSuggestion = async (placeId: string) => {
        setShowSuggest(false);
        setQuery('');
        setSuggestions([]);
        setSaving(true);
        setError('');
        try {
            const res = await fetch(`/api/places?place_id=${encodeURIComponent(placeId)}`, {
                headers: { Accept: 'application/json' },
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.success) throw new Error(body?.error || 'Place lookup failed');
            setAllCandidates((prev) => mergeCandidates([body.data, ...prev]));
        } catch (e: any) {
            setError(e?.message || 'Place lookup failed');
        } finally {
            setSaving(false);
        }
    };

    const save = async (payload: { lat: number; lng: number; address: string }) => {
        setSaving(true);
        setError('');
        try {
            const res = await fetch('/api/villages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ village, context, ...payload }),
            });
            const body = await res.json().catch(() => null);
            if (!res.ok || !body?.success) throw new Error(body?.error || 'Failed to save location');
            onSaved(payload.lat, payload.lng);
        } catch (e: any) {
            setError(e?.message || 'Failed to save location');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/50 p-4" onClick={onClose}>
            <div
                className="w-full max-w-xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h4 className="font-bold text-slate-800">Select location: {village}</h4>
                        {context && <p className="text-[11px] text-slate-500">Taluka/Sub-division: {context}, Bhavnagar</p>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                        ✕
                    </button>
                </div>
                <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
                    {/* 1. Drop a pin on the map — no lat/lng knowledge needed */}
                    <div>
                        <p className="text-xs font-bold text-slate-700 mb-1">
                            Tap the map to drop a pin{manual ? ' (tap again or drag it to move)' : ''}
                        </p>
                        <div ref={miniRef} className="h-56 w-full rounded-xl border border-slate-200 z-0" />
                        {mapReady && (
                            <div className="mt-1 flex items-center justify-between gap-2">
                                <p className="text-[11px] text-slate-500 font-mono">
                                    {manual ? `${manual.lat.toFixed(5)}, ${manual.lng.toFixed(5)}` : 'No pin dropped yet'}
                                </p>
                                <button
                                    type="button"
                                    disabled={saving || !manual}
                                    onClick={() =>
                                        manual &&
                                        save({
                                            lat: manual.lat,
                                            lng: manual.lng,
                                            address: `Pinned: ${manual.lat.toFixed(5)}, ${manual.lng.toFixed(5)}`,
                                        })
                                    }
                                    className="flex-shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer"
                                >
                                    Save pin
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 2. Candidates — nearest first */}
                    {sortedCandidates.length > 0 && (
                        <div>
                            <p className="text-xs font-bold text-slate-700 mb-1">
                                Matching places ({sortedCandidates.length}
                                {refPoint ? `, nearest ${refPoint.label} first` : ''})
                            </p>
                            <ul className="space-y-2">
                                {sortedCandidates.map(({ c, dist }, i) => (
                                    <li
                                        key={`${c.lat},${c.lng},${i}`}
                                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold text-slate-800 break-words">
                                                {c.address}
                                                {dist != null && refPoint && (
                                                    <span className="ml-2 inline-block rounded-full bg-emerald-100 px-2 py-px text-[10px] font-bold text-emerald-800">
                                                        {dist < 1
                                                            ? `${Math.round(dist * 1000)} m from ${refPoint.label}`
                                                            : `${dist.toFixed(1)} km from ${refPoint.label}`}
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-[11px] text-slate-500 font-mono">
                                                {c.lat.toFixed(5)}, {c.lng.toFixed(5)}
                                                <span className="ml-2 text-slate-400">({districtHint(c.address)})</span>
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            disabled={saving}
                                            onClick={() => save(c)}
                                            className="flex-shrink-0 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold cursor-pointer"
                                        >
                                            Use this
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* 3. Live search — type any spelling, pick from suggestions */}
                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-3">
                        <p className="text-xs font-bold text-slate-700 mb-1">Search live, like Google Maps</p>
                        <div className="relative">
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => {
                                    setQuery(e.target.value);
                                    setError('');
                                }}
                                onFocus={() => suggestions.length > 0 && setShowSuggest(true)}
                                onBlur={() => setTimeout(() => setShowSuggest(false), 150)}
                                placeholder={`e.g. pachhe… (looking for ${village})`}
                                className="w-full rounded-lg border border-slate-300 px-2 py-1.5 text-sm pr-8"
                            />
                            {suggesting && (
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm animate-pulse">
                                    …
                                </span>
                            )}
                            {showSuggest && suggestions.length > 0 && (
                                <ul className="absolute left-0 right-0 top-full mt-1 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden z-10">
                                    {suggestions.map((s) => (
                                        <li key={s.placeId}>
                                            <button
                                                type="button"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    pickSuggestion(s.placeId);
                                                }}
                                                className="w-full text-left px-3 py-2 hover:bg-emerald-50 cursor-pointer"
                                            >
                                                <p className="text-xs font-bold text-slate-800">{s.mainText}</p>
                                                {s.secondaryText && (
                                                    <p className="text-[11px] text-slate-500">{s.secondaryText}</p>
                                                )}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                            Pick a suggestion to add it to the list above, then “Use this”.
                        </p>
                    </div>
                    {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
                </div>
            </div>
        </div>
    );
}
