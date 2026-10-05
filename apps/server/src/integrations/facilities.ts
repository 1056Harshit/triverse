/**
 * Hospitals, clinics, pharmacies, sights and stays near a point.
 *   GOOGLE_MAPS_API_KEY set → Google Places (ratings, photos)
 *   otherwise               → OpenStreetMap via Overpass (free, no key; real names, phones, websites, Wikipedia)
 */
import type { Facility } from "@triverse/shared";
import { env } from "../env.ts";
import { haversineKm, type LatLng } from "./maps.ts";
import { photoUri, type PlaceDetails } from "./places.ts";

export type FacilityKind = "health" | "hospital" | "pharmacy" | "sights" | "stays" | "food" | "cafe";

// Public Overpass servers are sometimes overloaded; try the main one twice, then a mirror.
const OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass-api.de/api/interpreter"];
const UA = "PvtFrnd/1.0 (pvtfrnd.com)";

/** Each entry is one Overpass request; parts run one after another (unions of them are slow on Overpass). */
const QUERIES: Record<FacilityKind, (a: string) => string | string[]> = {
  health: (a) => `nwr["amenity"~"^(hospital|clinic|doctors|pharmacy)$"]["name"](${a});`,
  hospital: (a) => `nwr["amenity"="hospital"]["name"](${a});`,
  pharmacy: (a) => `nwr["amenity"="pharmacy"]["name"](${a});`,
  sights: (a) => [
    `nwr["tourism"~"^(attraction|viewpoint|museum|gallery)$"]["name"](${a});`,
    `nw["amenity"="place_of_worship"]["name"]["wikipedia"](${a});node["historic"]["name"]["wikipedia"](${a});`,
  ],
  stays: (a) => `nwr["tourism"~"^(hotel|guest_house|hostel|chalet|motel)$"]["name"](${a});`,
  food: (a) => `nwr["amenity"~"^(restaurant|fast_food|food_court)$"]["name"](${a});`,
  cafe: (a) => `nwr["amenity"="cafe"]["name"](${a});`,
};

const GOOGLE_TYPES: Record<FacilityKind, { type: string; text: string }> = {
  health: { type: "hospital", text: "hospitals and clinics" },
  hospital: { type: "hospital", text: "hospitals" },
  pharmacy: { type: "pharmacy", text: "pharmacies" },
  sights: { type: "tourist_attraction", text: "tourist attractions" },
  stays: { type: "lodging", text: "hotels" },
  food: { type: "restaurant", text: "restaurants" },
  cafe: { type: "cafe", text: "cafes" },
};

interface OsmElement { type: "node" | "way" | "relation"; id: number; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }

const cache = new Map<string, { at: number; data: Facility[] }>();

export async function findFacilities(kind: FacilityKind, near: LatLng, radiusKm = 10, limit = 30): Promise<Facility[]> {
  const key = `${kind}:${near.lat.toFixed(2)},${near.lng.toFixed(2)}:${radiusKm}`;
  const hit = cache.get(key);
  // Hospitals and sights rarely change; a long cache keeps us well inside Overpass fair-use limits.
  if (hit && Date.now() - hit.at < 6 * 3600_000) return hit.data.slice(0, limit);
  const data = env.GOOGLE_MAPS_API_KEY ? await fromGoogle(kind, near, radiusKm) : await fromOsm(kind, near, radiusKm);
  cache.set(key, { at: Date.now(), data });
  return data.slice(0, limit);
}

/* ─────────── OpenStreetMap ─────────── */

async function overpass(query: string): Promise<OsmElement[]> {
  let lastErr: unknown;
  for (const url of OVERPASS) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": UA },
        body: new URLSearchParams({ data: `[out:json][timeout:15];(${query});out center tags 150;` }),
        signal: AbortSignal.timeout(17_000),
      });
      if (res.ok) return ((await res.json()) as { elements: OsmElement[] }).elements;
      lastErr = new Error(`Overpass ${res.status}`);
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

async function fromOsm(kind: FacilityKind, near: LatLng, radiusKm: number): Promise<Facility[]> {
  // A bounding box is far faster on Overpass than "around:" (≈1 s vs. timeouts); we trim to the circle afterwards.
  const dLat = radiusKm / 111, dLng = radiusKm / (111 * Math.cos((near.lat * Math.PI) / 180));
  const bbox = `${(near.lat - dLat).toFixed(4)},${(near.lng - dLng).toFixed(4)},${(near.lat + dLat).toFixed(4)},${(near.lng + dLng).toFixed(4)}`;
  const parts = [QUERIES[kind](bbox)].flat();
  const elements: OsmElement[] = [];
  for (const q of parts) elements.push(...(await overpass(q).catch((e) => { if (parts.length === 1) throw e; return []; })));
  const seen = new Set<string>();
  return elements
    .map((e) => toFacility(e, near))
    .filter((f): f is Facility => !!f && f.distanceKm <= radiusKm && !seen.has(f.name.toLowerCase()) && (seen.add(f.name.toLowerCase()), true))
    .sort((a, b) => rank(kind, a) - rank(kind, b));
}

/** Hospitals with emergency/24×7 first, then by distance; sights with Wikipedia articles get a boost. */
function rank(kind: FacilityKind, f: Facility): number {
  let r = f.distanceKm;
  if ((kind === "health" || kind === "hospital") && f.category === "Hospital") r -= 3;
  if (f.emergency || f.open24x7) r -= 2;
  if (kind === "sights" && (f.wikipedia || f.photoUrl)) r -= 4;
  return r;
}

function toFacility(e: OsmElement, near: LatLng): Facility | null {
  const t = e.tags ?? {};
  const name = t["name:en"] || t.name;
  const lat = e.lat ?? e.center?.lat, lng = e.lon ?? e.center?.lon;
  if (!name || lat === undefined || lng === undefined) return null;
  const location = { lat, lng };
  const addr = [t["addr:housenumber"], t["addr:street"], t["addr:suburb"], t["addr:city"] || t["addr:district"], t["addr:postcode"]].filter(Boolean).join(", ");
  const op = (t["operator:type"] || t["healthcare:operator:type"] || "").toLowerCase();
  return {
    id: `osm:${e.type}/${e.id}`,
    name,
    category: categoryOf(t),
    address: addr || undefined,
    phone: t.phone || t["contact:phone"] || t["contact:mobile"] || undefined,
    website: normaliseUrl(t.website || t["contact:website"] || t.url),
    wikipedia: wikiUrl(t.wikipedia),
    photoUrl: imageUrl(t.image, t.wikimedia_commons),
    location,
    distanceKm: Math.round(haversineKm(near, location) * 10) / 10,
    open24x7: t.opening_hours === "24/7" || undefined,
    ownership: /gov|public|state|central/.test(op) ? "government" : /private/.test(op) ? "private" : /charit|ngo|religious/.test(op) ? "charity" : undefined,
    emergency: t.emergency === "yes" || undefined,
    source: "osm",
  };
}

function categoryOf(t: Record<string, string>): string {
  const a = t.amenity, h = t.healthcare, tour = t.tourism, hist = t.historic;
  if (a === "hospital" || h === "hospital") return "Hospital";
  if (a === "clinic" || h === "clinic" || h === "centre") return "Clinic";
  if (a === "doctors") return "Doctor";
  if (a === "pharmacy") return "Pharmacy";
  if (a === "place_of_worship") return t.religion === "hindu" ? "Temple" : t.religion === "buddhist" ? "Monastery" : t.religion === "sikh" ? "Gurdwara" : t.religion === "christian" ? "Church" : t.religion === "muslim" ? "Mosque" : "Place of worship";
  if (tour === "viewpoint") return "Viewpoint";
  if (tour === "museum" || tour === "gallery") return "Museum";
  if (a === "restaurant" || a === "fast_food" || a === "food_court") return t.cuisine ? `Restaurant · ${t.cuisine.split(";")[0].replace(/_/g, " ")}` : "Restaurant";
  if (a === "cafe") return "Café";
  if (tour && /hotel|guest_house|hostel|chalet|motel/.test(tour)) return tour === "guest_house" ? "Guest house" : tour[0].toUpperCase() + tour.slice(1);
  if (hist) return "Heritage";
  if (t.leisure === "nature_reserve") return "Nature";
  return "Attraction";
}

function normaliseUrl(u?: string): string | undefined {
  if (!u) return undefined;
  return /^https?:\/\//i.test(u) ? u : `https://${u}`;
}
function wikiUrl(w?: string): string | undefined {
  if (!w) return undefined;
  const m = /^([a-z-]+):(.+)$/.exec(w);
  return m ? `https://${m[1]}.wikipedia.org/wiki/${encodeURIComponent(m[2].replace(/ /g, "_"))}` : undefined;
}
function imageUrl(image?: string, commons?: string): string | undefined {
  if (image && /^https?:\/\//.test(image)) return image;
  const file = commons?.startsWith("File:") ? commons.slice(5) : image?.startsWith("File:") ? image.slice(5) : undefined;
  return file ? `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=1000` : undefined;
}

/** Details for one OpenStreetMap place (used by the shared place-detail screen). */
export async function osmDetails(id: string): Promise<PlaceDetails | null> {
  const m = /^osm:(node|way|relation)\/(\d+)$/.exec(id);
  if (!m) return null;
  const [el] = await overpass(`${m[1]}(${m[2]});`);
  if (!el) return null;
  const t = el.tags ?? {};
  const f = toFacility(el, { lat: el.lat ?? el.center?.lat ?? 0, lng: el.lon ?? el.center?.lon ?? 0 });
  if (!f) return null;
  const hours = t.opening_hours ? [t.opening_hours === "24/7" ? "Open 24 hours, every day" : t.opening_hours] : undefined;
  const summary = [t.description, t.wikipedia ? "More on Wikipedia." : undefined].filter(Boolean).join(" ") || undefined;
  return {
    id, name: f.name, address: f.address, location: f.location, phone: f.phone, website: f.website ?? f.wikipedia,
    mapsUrl: `https://www.google.com/maps/search/?api=1&query=${f.location.lat},${f.location.lng}`,
    hours, summary, sources: [], triScore: 0,
    photos: f.photoUrl ? [{ url: f.photoUrl, attribution: "Wikimedia Commons", source: "google" as const }] : [],
    reviews: [], sample: false,
  };
}

/* ─────────── Google Places ─────────── */

async function fromGoogle(kind: FacilityKind, near: LatLng, radiusKm: number): Promise<Facility[]> {
  const g = GOOGLE_TYPES[kind];
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json", "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY!,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber,places.websiteUri,places.rating,places.regularOpeningHours.weekdayDescriptions,places.photos,places.primaryTypeDisplayName",
    },
    body: JSON.stringify({ textQuery: g.text, includedType: g.type, regionCode: "IN", pageSize: 20, locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: Math.min(radiusKm, 50) * 1000 } } }),
  });
  if (!res.ok) return fromOsm(kind, near, radiusKm); // fall back to free data
  const data = (await res.json()) as { places?: Array<{
    id: string; displayName: { text: string }; formattedAddress?: string; location: { latitude: number; longitude: number };
    nationalPhoneNumber?: string; websiteUri?: string; rating?: number; primaryTypeDisplayName?: { text: string };
    regularOpeningHours?: { weekdayDescriptions?: string[] }; photos?: Array<{ name: string }>;
  }> };
  return Promise.all((data.places ?? []).map(async (p) => {
    const location = { lat: p.location.latitude, lng: p.location.longitude };
    return {
      id: `g:${p.id}`, name: p.displayName.text, category: p.primaryTypeDisplayName?.text ?? g.text, address: p.formattedAddress,
      phone: p.nationalPhoneNumber, website: p.websiteUri, rating: p.rating, location,
      distanceKm: Math.round(haversineKm(near, location) * 10) / 10,
      open24x7: p.regularOpeningHours?.weekdayDescriptions?.every((d) => /24 hours/i.test(d)) || undefined,
      photoUrl: p.photos?.[0] ? await photoUri(p.photos[0].name, 600).catch(() => undefined) : undefined,
      source: "google" as const,
    } satisfies Facility;
  })).then((list) => list.sort((a, b) => a.distanceKm - b.distanceKm));
}
