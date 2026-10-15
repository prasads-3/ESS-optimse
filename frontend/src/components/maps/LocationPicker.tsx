import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Crosshair, Loader2, Maximize2, Minimize2, Search } from "lucide-react";
import { getCurrentPosition } from "@/lib/geo";
import { toast } from "sonner";

// Fix default marker icon paths under Vite.
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

export type LatLng = { lat: number; lng: number };

const DEFAULT_CENTER: [number, number] = [19.076, 72.8777]; // Mumbai

function ClickHandler({ onPick }: { onPick: (p: LatLng) => void }) {
    useMapEvents({
        click(e) {
            onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
        },
    });
    return null;
}

// Recenters the map every time `target` changes. A monotonic `nonce` is used as
// the effect dependency so searching the *same* address again still re-centers.
function Recenter({ target }: { target: { center: [number, number]; nonce: number } | null }) {
    const map = useMap();
    useEffect(() => {
        if (target) map.flyTo(target.center, Math.max(map.getZoom(), 15), { duration: 1 });
    }, [target?.nonce]); // eslint-disable-line react-hooks/exhaustive-deps
    return null;
}

// Leaflet renders at the wrong size when its container is mounted inside a
// dialog that animates open. Recompute the size once tiles can lay out.
function InvalidateSizeOnMount() {
    const map = useMap();
    useEffect(() => {
        const t = setTimeout(() => map.invalidateSize(), 200);
        return () => clearTimeout(t);
    }, [map]);
    return null;
}

// Leaflet must re-measure its container whenever it resizes (e.g. toggling the
// map in and out of fullscreen), otherwise tiles render at the old dimensions.
function InvalidateSizeOn({ trigger }: { trigger: unknown }) {
    const map = useMap();
    useEffect(() => {
        const t = setTimeout(() => map.invalidateSize(), 250);
        return () => clearTimeout(t);
    }, [trigger, map]);
    return null;
}

type NominatimResult = {
    place_id?: number;
    lat: string;
    lon: string;
    display_name?: string;
    importance?: number;
    place_rank?: number;
};

/** How specific the query that produced a match was. */
type MatchLevel = "building" | "street" | "area" | "region" | "pincode" | "country";

export type GeoMatch = {
    lat: number;
    lng: number;
    formattedAddress: string;
    placeId?: number;
    /** 0–100. < 80 ⇒ prompt the admin to nudge the pin. */
    confidence: number;
    source: MatchLevel;
};

const SOURCE_LABEL: Record<MatchLevel, string> = {
    building: "Building / Society",
    street: "Street / Sector",
    area: "Area / City",
    region: "State / Region",
    pincode: "PIN code centroid",
    country: "Country",
};

// Baseline confidence (0–100) by how specific the matching query was.
const LEVEL_BASE: Record<MatchLevel, number> = {
    building: 62,
    street: 56,
    area: 46,
    region: 38,
    pincode: 30,
    country: 18,
};

// ── Step 1+2: smart address normalization ────────────────────────────────────
// Strip apartment/unit identifiers and fix inconsistent formatting so the
// geocoder never has to deal with raw, noisy user text.
const NOISE_PATTERNS: RegExp[] = [
    /[([{][^)\]}]*[)\]}]/g,                                             // bracketed text: "(India)"
    /\b(?:ground|lower|upper|basement|\d+(?:st|nd|rd|th)?)\s*floor\b/gi, // "4th Floor", "Ground Floor"
    /\bfloor\s*(?:no\.?|number)?\s*\d+\b/gi,                            // "Floor 4"
    /\b(?:wing)\s*[-:]?\s*[a-z0-9]+\b/gi,                               // "Wing A"
    /\b[a-z]\s*wing\b/gi,                                              // "A Wing"
    /\b(?:flat|unit|apartment|apt|room|door|shop|plot|gala|house|block|tower)\.?\s*(?:no\.?|number|#)?\s*[-:]?\s*[a-z]?[-/]?\d+[a-z]?\b/gi, // "Flat No 3B"
    /\bno\.?\s*\d+[a-z]?\b/gi,                                          // "No. 5"
    /#\s*\d+[a-z]?/g,                                                  // "#604"
];

function normalizeAddress(raw: string): string {
    let s = raw;
    for (const re of NOISE_PATTERNS) s = s.replace(re, " ");
    // Leading society/unit code that survived, e.g. "B-604," or "A 101 " at the start.
    s = s.replace(/^\s*[a-z]\s*[-/]?\s*\d{1,4}[a-z]?\s*,?/i, " ");
    return s
        .replace(/\s+-\s+/g, " ")          // " - " used as a separator
        .replace(/\s*,(?:\s*,)+/g, ",")    // collapse repeated commas
        .replace(/\s*,\s*/g, ", ")         // tidy comma spacing
        .replace(/^[\s,]+|[\s,]+$/g, "")   // trim leading/trailing commas/space
        .replace(/\s{2,}/g, " ")           // multiple spaces → single
        .trim();
}

// Significant tokens of the building/society name, used to reward exact matches.
const STOP_WORDS = new Set(["near", "opposite", "behind", "next", "road", "cross", "main", "the", "and"]);
function significantWords(s: string): string[] {
    return (s.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter(w => !STOP_WORDS.has(w));
}

async function nominatimSearch(q: string): Promise<NominatimResult[]> {
    const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&q=${encodeURIComponent(q)}`,
        { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? (data as NominatimResult[]) : [];
}

// ── Step 6+7: confidence score, rewarding exact society/building name matches.
function scoreResult(r: NominatimResult, level: MatchLevel, buildingWords: string[]): number {
    const importance = Math.round((r.importance ?? 0) * 23); // 0..~23
    const name = (r.display_name ?? "").toLowerCase();
    const nameHit = buildingWords.length && buildingWords.some(w => name.includes(w)) ? 15 : 0;
    return Math.min(100, LEVEL_BASE[level] + importance + nameHit);
}

/**
 * Geocode a free-form address. Steps:
 *  1–2. Normalize: strip flat/unit/wing/floor IDs, brackets, extra commas/spaces.
 *  3.   Generate multiple search variations (full → building+city → sector+city+pin
 *       → city+pin → building-only → PIN centroid).
 *  4–5. Run them in priority order against Nominatim, progressively broadening.
 *  6–7. Score every candidate and keep the highest-confidence / best name match.
 * Never geocodes the raw text directly — always the normalized variations.
 */
async function geocode(raw: string): Promise<GeoMatch | null> {
    const normalized = normalizeAddress(raw);
    if (!normalized) return null;

    const pin = normalized.match(/\b\d{5,6}\b/)?.[0] ?? null;
    const parts = normalized.split(",").map(s => s.trim()).filter(Boolean);
    if (parts.length === 0) return null;

    const building = parts[0];
    const buildingWords = significantWords(building);
    const lastPart = parts[parts.length - 1] ?? "";
    const cityPart = lastPart.replace(/\b\d{5,6}\b/, "").trim(); // last segment minus PIN

    const levelFor = (i: number): MatchLevel => (i === 0 ? "building" : i === 1 ? "street" : "area");

    // Step 3 — build prioritized, normalized variations.
    const variations: { q: string; level: MatchLevel }[] = [];
    const add = (q: string, level: MatchLevel) => {
        const t = q.replace(/\s*,\s*/g, ", ").replace(/\s{2,}/g, " ").trim().replace(/^,|,$/g, "").trim();
        if (t) variations.push({ q: t, level });
    };

    add(parts.join(", "), "building");                              // V1: full address
    if (parts.length > 1) add(`${building}, ${lastPart}`, "building"); // building + city/pin
    if (cityPart && cityPart !== building) add(`${building}, ${cityPart}`, "building"); // building + city (no pin)
    for (let i = 1; i < parts.length; i++) add(parts.slice(i).join(", "), levelFor(i)); // drop leading parts
    add(building, "building");                                       // building name only
    if (pin) {                                                       // PIN-code fallback
        if (cityPart && cityPart !== pin) add(`${pin}, ${cityPart}`, "pincode");
        add(pin, "pincode");
    }

    // Steps 4–7 — query in order, keep the best-scoring match, early-exit when strong.
    const seen = new Set<string>();
    let best: GeoMatch | null = null;
    for (const { q, level } of variations) {
        const key = q.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        for (const r of await nominatimSearch(q)) {
            const confidence = scoreResult(r, level, buildingWords);
            if (!best || confidence > best.confidence) {
                best = {
                    lat: parseFloat(r.lat),
                    lng: parseFloat(r.lon),
                    formattedAddress: r.display_name ?? q,
                    placeId: r.place_id,
                    confidence,
                    source: level,
                };
            }
        }
        if (best && best.confidence >= 85) break; // confident enough — stop hitting the API
    }
    return best;
}

/**
 * Interactive map for picking a task location. Click or drag the marker to set
 * latitude/longitude; the circle previews the allowed check-in radius.
 */
export function LocationPicker({
    value,
    radius,
    onChange,
    height = 320,
}: {
    value: LatLng | null;
    radius: number;
    // `meta` is supplied on a successful address search so the caller can persist
    // formatted_address / place_id / confidence alongside the coordinates.
    onChange: (p: LatLng, meta?: GeoMatch) => void;
    height?: number;
}) {
    const [locating, setLocating] = useState(false);
    const [searching, setSearching] = useState(false);
    const [maximized, setMaximized] = useState(false);
    const [query, setQuery] = useState("");

    // Esc exits fullscreen; lock background scroll while maximized.
    useEffect(() => {
        if (!maximized) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") setMaximized(false);
        };
        window.addEventListener("keydown", onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            window.removeEventListener("keydown", onKey);
            document.body.style.overflow = prev;
        };
    }, [maximized]);
    const [flyTo, setFlyTo] = useState<{ center: [number, number]; nonce: number } | null>(null);
    const [match, setMatch] = useState<GeoMatch | null>(null);
    const flyNonce = useRef(0);
    const markerRef = useRef<L.Marker | null>(null);

    const recenter = (lat: number, lng: number) =>
        setFlyTo({ center: [lat, lng], nonce: ++flyNonce.current });

    // A manual map click / marker drag overrides the geocoded match, so drop it.
    const pickManual = (p: LatLng) => {
        setMatch(null);
        onChange(p);
    };

    const center: [number, number] = useMemo(
        () => (value ? [value.lat, value.lng] : DEFAULT_CENTER),
        [value]
    );

    const locateMe = async () => {
        setLocating(true);
        try {
            const pos = await getCurrentPosition();
            onChange({ lat: pos.latitude, lng: pos.longitude });
            recenter(pos.latitude, pos.longitude);
        } catch (e: any) {
            toast.error(e?.message || "Could not get your location");
        } finally {
            setLocating(false);
        }
    };

    // Geocode the query via OpenStreetMap Nominatim, then drop the location pin
    // there and recenter the map so the searched address is shown immediately.
    // The admin can still drag the marker or click the map to fine-tune.
    const search = async () => {
        const q = query.trim();
        if (!q) return;
        setSearching(true);
        try {
            const hit = await geocode(q);
            if (!hit) {
                toast.error("Location not found — try a more specific address");
                return;
            }
            onChange({ lat: hit.lat, lng: hit.lng }, hit);
            recenter(hit.lat, hit.lng);
            setMatch(hit);
            const label = `${SOURCE_LABEL[hit.source]} · ${hit.confidence}% confidence`;
            if (hit.confidence < 80) {
                toast.warning(`${label} — drag the pin to the exact spot`, {
                    description: hit.formattedAddress,
                });
            } else {
                toast.success(label, { description: hit.formattedAddress });
            }
        } catch {
            toast.error("Search failed — check your connection");
        } finally {
            setSearching(false);
        }
    };

    return (
        <div
            className={
                maximized
                    ? "fixed inset-0 z-[1000] bg-white"
                    : "relative rounded-md overflow-hidden border border-border/60"
            }
        >
            <div style={{ height: maximized ? "100%" : height }} className="relative z-0 h-full">
                <MapContainer
                    center={center}
                    zoom={value ? 15 : 11}
                    scrollWheelZoom
                    style={{ height: "100%", width: "100%" }}
                >
                    <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <ClickHandler onPick={pickManual} />
                    <Recenter target={flyTo} />
                    <InvalidateSizeOnMount />
                    <InvalidateSizeOn trigger={maximized} />
                    {value && (
                        <>
                            <Marker
                                position={[value.lat, value.lng]}
                                draggable
                                ref={markerRef}
                                eventHandlers={{
                                    dragend() {
                                        const m = markerRef.current;
                                        if (m) {
                                            const ll = m.getLatLng();
                                            pickManual({ lat: ll.lat, lng: ll.lng });
                                        }
                                    },
                                }}
                            />
                            <Circle
                                center={[value.lat, value.lng]}
                                radius={radius}
                                pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.15 }}
                            />
                        </>
                    )}
                </MapContainer>
            </div>

            {/* Search bar */}
            <div className="absolute top-3 left-3 right-3 z-[400] flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white/95 rounded-md shadow-md border border-slate-200 pl-3 pr-1 py-1 flex-1 max-w-sm">
                    <Search size={14} className="text-slate-400 shrink-0" />
                    <input
                        type="text"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === "Enter") {
                                e.preventDefault();
                                void search();
                            }
                        }}
                        placeholder="Enter near place"
                        className="flex-1 min-w-0 bg-transparent text-xs font-medium text-slate-700 focus:outline-none py-1"
                    />
                    <button
                        type="button"
                        onClick={() => void search()}
                        disabled={searching}
                        className="flex items-center gap-1 bg-primary hover:bg-primary/95 text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-sm disabled:opacity-60 transition-colors shrink-0"
                    >
                        {searching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12} />}
                        Search
                    </button>
                </div>
            </div>

            <button
                type="button"
                onClick={locateMe}
                disabled={locating}
                className="absolute top-14 right-3 z-[400] flex items-center gap-1.5 bg-white/95 hover:bg-white text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-md border border-slate-200 transition-colors"
            >
                {locating ? <Loader2 size={14} className="animate-spin" /> : <Crosshair size={14} />}
                Use my location
            </button>

            <button
                type="button"
                onClick={() => setMaximized(m => !m)}
                title={maximized ? "Exit fullscreen (Esc)" : "Maximize map"}
                className="absolute top-[6.25rem] right-3 z-[400] flex items-center gap-1.5 bg-white/95 hover:bg-white text-slate-700 text-xs font-semibold px-3 py-2 rounded-md shadow-md border border-slate-200 transition-colors"
            >
                {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                {maximized ? "Exit" : "Maximize"}
            </button>

            <div className="absolute bottom-3 left-3 right-3 z-[400] flex flex-col gap-1 pointer-events-none">
                {match && (
                    <div className="self-start max-w-[90%] bg-white/95 rounded-md shadow border border-slate-200 px-3 py-1.5">
                        <div className="flex items-center gap-1.5">
                            <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                    match.confidence >= 80
                                        ? "bg-emerald-500"
                                        : match.confidence >= 60
                                          ? "bg-amber-500"
                                          : "bg-rose-500"
                                }`}
                            />
                            <span className="text-[11px] font-semibold text-slate-700">
                                {SOURCE_LABEL[match.source]} · {match.confidence}% confidence
                            </span>
                        </div>
                        <p className="text-[10px] text-slate-500 truncate">{match.formattedAddress}</p>
                        {match.confidence < 80 && (
                            <p className="text-[10px] font-medium text-amber-600 mt-0.5">
                                Low confidence — drag the pin to the exact location.
                            </p>
                        )}
                    </div>
                )}
                <div className="self-start bg-white/95 text-slate-600 text-[11px] font-medium px-3 py-1.5 rounded-md shadow border border-slate-200">
                    {value
                        ? `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)} · radius ${radius}m`
                        : "Search an address or click the map to drop a pin"}
                </div>
            </div>
        </div>
    );
}

const dot = (color: string) =>
    L.divIcon({
        html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 0 4px rgba(0,0,0,.4)"></div>`,
        className: "fieldtask-div-icon",
        iconSize: [14, 14],
        iconAnchor: [7, 7],
    });

/** Read-only map showing the task location, its radius, and check-in/out points. */
export function LocationViewMap({
    task,
    height = 260,
}: {
    task: {
        latitude: number;
        longitude: number;
        allowedRadius: number;
        checkInLat?: number | null;
        checkInLng?: number | null;
        checkOutLat?: number | null;
        checkOutLng?: number | null;
    };
    height?: number;
}) {
    const center: [number, number] = [task.latitude, task.longitude];
    return (
        <div className="rounded-md overflow-hidden border border-border/60" style={{ height }}>
            <MapContainer center={center} zoom={15} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
                <TileLayer
                    attribution="&copy; OpenStreetMap contributors"
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={center} icon={dot("#2563eb")} />
                <Circle
                    center={center}
                    radius={task.allowedRadius}
                    pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.12 }}
                />
                {task.checkInLat != null && task.checkInLng != null && (
                    <Marker position={[task.checkInLat, task.checkInLng]} icon={dot("#10b981")} />
                )}
                {task.checkOutLat != null && task.checkOutLng != null && (
                    <Marker position={[task.checkOutLat, task.checkOutLng]} icon={dot("#f59e0b")} />
                )}
            </MapContainer>
        </div>
    );
}
