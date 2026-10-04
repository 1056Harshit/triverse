import { env } from "../env.ts";
import { haversineKm, type LatLng } from "./maps.ts";

export type PlaceKind = "restaurant" | "lodging" | "cafe";

export interface SourceRating { source: "google" | "tripadvisor"; rating: number; reviews: number; url?: string; externalId?: string }
export interface RankedPlace {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  distanceKm: number;
  priceLevel?: number;
  openNow?: boolean;
  photoUrl?: string;
  /** Google photo resource name; resolved to a key-less URL server-side (never send the API key to clients). */
  photoName?: string;
  sources: SourceRating[];
  /** Combined score out of 5, see `triScore`. */
  triScore: number;
  totalReviews: number;
  highlights: string[];
}

/**
 * TriScore: a Bayesian average across sources. Each source's rating is pulled
 * toward a prior (3.8★) in proportion to how few reviews it has, then sources
 * are weighted by review volume. A 4.9★ place with 12 reviews ranks below a
 * 4.6★ place with 3,000.
 */
export function triScore(sources: SourceRating[], prior = 3.8, priorWeight = 40): number {
  const total = sources.reduce((s, r) => s + r.reviews, 0);
  if (total === 0) return 0;
  const weighted = sources.reduce((s, r) => s + r.rating * r.reviews, 0);
  return Math.round(((weighted + prior * priorWeight) / (total + priorWeight)) * 100) / 100;
}

export async function findPlaces(opts: { query?: string; kind: PlaceKind; near: LatLng; radiusKm?: number; limit?: number }): Promise<RankedPlace[]> {
  const radiusKm = opts.radiusKm ?? 5;
  const google = await googlePlaces(opts.kind, opts.near, radiusKm, opts.query);
  // Enrich with TripAdvisor where we have a key, matching by name + proximity.
  const merged = await Promise.all(google.map(async (p) => {
    const ta = await tripAdvisorMatch(p.name, p.location).catch(() => null);
    const sources = ta ? [...p.sources, ta] : p.sources;
    return { ...p, sources, triScore: triScore(sources), totalReviews: sources.reduce((s, r) => s + r.reviews, 0) };
  }));
  // Rank by TriScore with a gentle distance penalty.
  const top = merged
    .map((p) => ({ p, rank: p.triScore - Math.min(p.distanceKm / radiusKm, 1) * 0.25 }))
    .sort((a, b) => b.rank - a.rank)
    .slice(0, opts.limit ?? 10)
    .map(({ p }) => p);
  return Promise.all(top.map(async ({ photoName, ...p }) => ({ ...p, photoUrl: photoName ? await photoUri(photoName, 800).catch(() => undefined) : undefined })));
}

const photoCache = new Map<string, { url: string; at: number }>();
/** Turns a Places photo name into a short-lived, key-less googleusercontent URL (cached ~50 min). */
export async function photoUri(name: string, maxWidthPx = 1200): Promise<string> {
  const k = `${name}@${maxWidthPx}`;
  const hit = photoCache.get(k);
  if (hit && Date.now() - hit.at < 50 * 60_000) return hit.url;
  const res = await fetch(`https://places.googleapis.com/v1/${name}/media?maxWidthPx=${maxWidthPx}&skipHttpRedirect=true`, { headers: { "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY ?? "" } });
  if (!res.ok) throw new Error(`photo ${res.status}`);
  const { photoUri: url } = (await res.json()) as { photoUri: string };
  photoCache.set(k, { url, at: Date.now() });
  return url;
}

export interface PlaceReview {
  source: "google" | "tripadvisor";
  author: string;
  authorPhoto?: string;
  authorUrl?: string;
  rating: number;
  text: string;
  when: string;
}
export interface PlacePhoto { url: string; attribution?: string; source: "google" | "tripadvisor" }
export interface PlaceDetails {
  id: string;
  name: string;
  address?: string;
  location?: LatLng;
  phone?: string;
  website?: string;
  mapsUrl?: string;
  openNow?: boolean;
  hours?: string[];
  summary?: string;
  priceLevel?: number;
  sources: SourceRating[];
  triScore: number;
  photos: PlacePhoto[];
  reviews: PlaceReview[];
  /** True when no Maps key is configured and the data is a sample. */
  sample: boolean;
}

/** Full details for one place: photos and reviews from Google (and TripAdvisor when configured). */
export async function placeDetails(id: string): Promise<PlaceDetails | null> {
  if (id.startsWith("demo:")) return demoDetails(id);
  if (id.startsWith("osm:")) return (await import("./facilities.ts")).osmDetails(id);
  if (!id.startsWith("g:") || !env.GOOGLE_MAPS_API_KEY) return null;
  const placeId = id.slice(2);
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location,rating,userRatingCount,priceLevel,currentOpeningHours.openNow,regularOpeningHours.weekdayDescriptions,nationalPhoneNumber,websiteUri,googleMapsUri,photos,reviews,editorialSummary",
    },
  });
  if (!res.ok) throw new Error(`Place details ${res.status}`);
  const p = (await res.json()) as {
    displayName: { text: string }; formattedAddress?: string; location?: { latitude: number; longitude: number };
    rating?: number; userRatingCount?: number; priceLevel?: string; currentOpeningHours?: { openNow?: boolean };
    regularOpeningHours?: { weekdayDescriptions?: string[] }; nationalPhoneNumber?: string; websiteUri?: string; googleMapsUri?: string;
    editorialSummary?: { text: string };
    photos?: Array<{ name: string; authorAttributions?: Array<{ displayName: string }> }>;
    reviews?: Array<{ rating: number; text?: { text: string }; originalText?: { text: string }; relativePublishTimeDescription?: string; authorAttribution?: { displayName: string; photoUri?: string; uri?: string } }>;
  };
  const loc = p.location ? { lat: p.location.latitude, lng: p.location.longitude } : undefined;
  const sources: SourceRating[] = p.rating ? [{ source: "google", rating: p.rating, reviews: p.userRatingCount ?? 0, url: p.googleMapsUri }] : [];
  const resolved = await Promise.all((p.photos ?? []).slice(0, 10).map(async (ph): Promise<PlacePhoto | null> => {
    const url = await photoUri(ph.name, 1200).catch(() => null);
    return url ? { url, attribution: ph.authorAttributions?.[0]?.displayName, source: "google" } : null;
  }));
  const photos: PlacePhoto[] = resolved.filter((x): x is PlacePhoto => x !== null);
  const reviews: PlaceReview[] = (p.reviews ?? []).map((r) => ({
    source: "google", author: r.authorAttribution?.displayName ?? "Google user", authorPhoto: r.authorAttribution?.photoUri, authorUrl: r.authorAttribution?.uri,
    rating: r.rating, text: r.text?.text ?? r.originalText?.text ?? "", when: r.relativePublishTimeDescription ?? "",
  }));

  // TripAdvisor adds a second rating, more reviews and photos when its key is configured.
  if (env.TRIPADVISOR_API_KEY && loc) {
    const ta = await tripAdvisorMatch(p.displayName.text, loc).catch(() => null);
    if (ta) {
      sources.push(ta);
      const extra = await tripAdvisorExtras(ta.externalId!).catch(() => ({ reviews: [], photos: [] }));
      reviews.push(...extra.reviews);
      photos.push(...extra.photos);
    }
  }
  const priceMap: Record<string, number> = { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };
  return {
    id, name: p.displayName.text, address: p.formattedAddress, location: loc, phone: p.nationalPhoneNumber, website: p.websiteUri, mapsUrl: p.googleMapsUri,
    openNow: p.currentOpeningHours?.openNow, hours: p.regularOpeningHours?.weekdayDescriptions, summary: p.editorialSummary?.text,
    priceLevel: p.priceLevel ? priceMap[p.priceLevel] : undefined, sources, triScore: triScore(sources), photos, reviews, sample: false,
  };
}

async function tripAdvisorExtras(locationId: string): Promise<{ reviews: PlaceReview[]; photos: PlacePhoto[] }> {
  const base = `https://api.content.tripadvisor.com/api/v1/location/${locationId}`;
  const key = `key=${env.TRIPADVISOR_API_KEY}&language=en`;
  const [rv, ph] = await Promise.all([
    fetch(`${base}/reviews?${key}`).then((r) => r.json()) as Promise<{ data?: Array<{ rating: number; text: string; title?: string; published_date?: string; user?: { username?: string; avatar?: { small?: string } } }> }>,
    fetch(`${base}/photos?${key}`).then((r) => r.json()) as Promise<{ data?: Array<{ images?: { large?: { url: string } }; user?: { username?: string } }> }>,
  ]);
  return {
    reviews: (rv.data ?? []).map((r) => ({ source: "tripadvisor" as const, author: r.user?.username ?? "Tripadvisor user", authorPhoto: r.user?.avatar?.small, rating: r.rating, text: [r.title, r.text].filter(Boolean).join(" — "), when: r.published_date?.slice(0, 10) ?? "" })),
    photos: (ph.data ?? []).filter((p) => p.images?.large?.url).map((p) => ({ url: p.images!.large!.url, attribution: p.user?.username, source: "tripadvisor" as const })),
  };
}

/** Sample details for demo places (no Maps key). Flagged `sample: true`; reviews are clearly placeholders. */
function demoDetails(id: string): PlaceDetails {
  return {
    id, name: "", sources: [], triScore: 0, photos: [], sample: true,
    reviews: [
      { source: "google", author: "Sample review", rating: 5, text: "This is placeholder text. Add GOOGLE_MAPS_API_KEY on the server to see real Google photos and reviews here.", when: "sample" },
    ],
  };
}

async function googlePlaces(kind: PlaceKind, near: LatLng, radiusKm: number, query?: string): Promise<RankedPlace[]> {
  if (!env.GOOGLE_MAPS_API_KEY) {
    // Sample data only for automated tests; real users get real OpenStreetMap places (without ratings).
    if (env.NODE_ENV === "test") return demoPlaces(kind, near);
    return osmPlaces(kind, near, radiusKm, query);
  }
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.priceLevel,places.currentOpeningHours.openNow,places.googleMapsUri,places.photos,places.editorialSummary",
    },
    body: JSON.stringify({
      textQuery: query ? `${query} ${kind}` : kind === "lodging" ? "hotels" : `${kind}s`,
      includedType: kind, regionCode: "IN", pageSize: 20,
      locationBias: { circle: { center: { latitude: near.lat, longitude: near.lng }, radius: radiusKm * 1000 } },
    }),
  });
  if (!res.ok) throw new Error(`Places API ${res.status}`);
  const data = (await res.json()) as { places?: Array<{
    id: string; displayName: { text: string }; formattedAddress: string; location: { latitude: number; longitude: number };
    rating?: number; userRatingCount?: number; priceLevel?: string; currentOpeningHours?: { openNow: boolean };
    googleMapsUri?: string; photos?: Array<{ name: string }>; editorialSummary?: { text: string };
  }> };
  const priceMap: Record<string, number> = { PRICE_LEVEL_INEXPENSIVE: 1, PRICE_LEVEL_MODERATE: 2, PRICE_LEVEL_EXPENSIVE: 3, PRICE_LEVEL_VERY_EXPENSIVE: 4 };
  return (data.places ?? []).filter((p) => p.rating).map((p) => {
    const loc = { lat: p.location.latitude, lng: p.location.longitude };
    const sources: SourceRating[] = [{ source: "google", rating: p.rating!, reviews: p.userRatingCount ?? 0, url: p.googleMapsUri }];
    return {
      id: `g:${p.id}`, name: p.displayName.text, address: p.formattedAddress, location: loc,
      distanceKm: Math.round(haversineKm(near, loc) * 10) / 10,
      priceLevel: p.priceLevel ? priceMap[p.priceLevel] : undefined, openNow: p.currentOpeningHours?.openNow,
      photoName: p.photos?.[0]?.name,
      sources, triScore: triScore(sources), totalReviews: sources[0].reviews,
      highlights: p.editorialSummary ? [p.editorialSummary.text] : [],
    };
  });
}

/** TripAdvisor Content API: location search, then details for rating + review count. */
async function tripAdvisorMatch(name: string, at: LatLng): Promise<SourceRating | null> {
  if (!env.TRIPADVISOR_API_KEY) return null;
  const base = "https://api.content.tripadvisor.com/api/v1/location";
  const q = new URLSearchParams({ key: env.TRIPADVISOR_API_KEY, searchQuery: name, latLong: `${at.lat},${at.lng}`, radius: "0.3", radiusUnit: "km", language: "en" });
  const search = (await (await fetch(`${base}/search?${q}`)).json()) as { data?: Array<{ location_id: string }> };
  const id = search.data?.[0]?.location_id;
  if (!id) return null;
  const d = (await (await fetch(`${base}/${id}/details?key=${env.TRIPADVISOR_API_KEY}&language=en&currency=INR`)).json()) as {
    rating?: string; num_reviews?: string; web_url?: string;
  };
  if (!d.rating) return null;
  return { source: "tripadvisor", rating: Number(d.rating), reviews: Number(d.num_reviews ?? 0), url: d.web_url, externalId: id };
}

/** Real restaurants, cafés and stays from OpenStreetMap. No ratings exist there, so TriScore is 0 ("not rated"). */
async function osmPlaces(kind: PlaceKind, near: LatLng, radiusKm: number, query?: string): Promise<RankedPlace[]> {
  const { findFacilities } = await import("./facilities.ts");
  const list = await findFacilities(kind === "lodging" ? "stays" : kind === "cafe" ? "cafe" : "food", near, radiusKm, 40);
  const q = query?.toLowerCase().split(/\s+/).filter((w) => w.length > 2) ?? [];
  return list
    .filter((f) => !q.length || q.some((w) => `${f.name} ${f.category}`.toLowerCase().includes(w)))
    .map((f) => ({
      id: f.id, name: f.name, address: f.address ?? "", location: f.location, distanceKm: f.distanceKm, photoUrl: f.photoUrl,
      sources: [], triScore: 0, totalReviews: 0, highlights: [f.category],
    }));
}

function demoPlaces(kind: PlaceKind, near: LatLng): RankedPlace[] {
  const seed: Array<[string, number, number, number, number, string]> = kind === "lodging"
    ? [["Hillcrest Retreat", 4.6, 2140, 4.5, 880, "Valley-view rooms, 6 min walk to the Mall"], ["Pine Nest Homestay", 4.8, 310, 5, 95, "Family-run, home-cooked Himachali dinner"], ["The Ridge Grand", 4.3, 5200, 4, 1900, "Large hotel, parking, conference hall"]]
    : [["Himachali Rasoi", 4.6, 3200, 4.5, 870, "Authentic siddu and chha gosht"], ["Café Deodar", 4.7, 1450, 4.5, 410, "Wood-fired pizzas, sunset deck"], ["Sharma Bhojnalaya", 4.4, 6100, 4, 300, "Budget veg thali, open till 11 PM"], ["Brew & Bloom", 4.9, 64, 5, 8, "New specialty coffee bar"]];
  return seed.map(([name, g, gn, t, tn, hl], i) => {
    const sources: SourceRating[] = [{ source: "google", rating: g, reviews: gn }, { source: "tripadvisor", rating: t, reviews: tn }];
    const loc = { lat: near.lat + 0.004 * (i + 1), lng: near.lng - 0.003 * i };
    return { id: `demo:${i}`, name, address: "Mall Road area", location: loc, distanceKm: Math.round(haversineKm(near, loc) * 10) / 10, priceLevel: 2, openNow: true,
      sources, triScore: triScore(sources), totalReviews: gn + tn, highlights: [hl] };
  }).sort((a, b) => b.triScore - a.triScore);
}
