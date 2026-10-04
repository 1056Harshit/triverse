import { env } from "../env.ts";

export interface LatLng { lat: number; lng: number }
export interface RouteInfo { distanceKm: number; durationMin: number; tollsInr: number; polyline: string | null; hillRoute: boolean }

/** Google Routes API v2 with toll estimates. Falls back to a haversine estimate without a key. */
export async function computeRoute(origin: LatLng, destination: LatLng, waypoints: LatLng[] = []): Promise<RouteInfo> {
  if (!env.GOOGLE_MAPS_API_KEY) return fallbackRoute(origin, destination);
  const toWp = (p: LatLng) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
  const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
      "X-Goog-FieldMask": "routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.travelAdvisory.tollInfo",
    },
    body: JSON.stringify({
      origin: toWp(origin), destination: toWp(destination), intermediates: waypoints.map(toWp),
      travelMode: "DRIVE", routingPreference: "TRAFFIC_AWARE",
      extraComputations: ["TOLLS"], routeModifiers: { vehicleInfo: { emissionType: "GASOLINE" } },
      regionCode: "IN", units: "METRIC",
    }),
  });
  if (!res.ok) throw new Error(`Routes API ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as {
    routes?: Array<{ distanceMeters: number; duration: string; polyline?: { encodedPolyline: string };
      travelAdvisory?: { tollInfo?: { estimatedPrice?: Array<{ currencyCode: string; units?: string }> } } }>;
  };
  const r = data.routes?.[0];
  if (!r) throw new Error("No drivable route found");
  const toll = r.travelAdvisory?.tollInfo?.estimatedPrice?.find((p) => p.currencyCode === "INR");
  const distanceKm = r.distanceMeters / 1000;
  const durationMin = parseInt(r.duration, 10) / 60;
  return {
    distanceKm: round1(distanceKm), durationMin: Math.round(durationMin),
    tollsInr: toll?.units ? Number(toll.units) : 0, polyline: r.polyline?.encodedPolyline ?? null,
    // Average speed under ~38 km/h over a long route is a good proxy for hill/ghat roads.
    hillRoute: distanceKm > 30 && distanceKm / (durationMin / 60) < 38,
  };
}

export async function geocode(query: string): Promise<(LatLng & { name: string }) | null> {
  if (!env.GOOGLE_MAPS_API_KEY) return KNOWN_PLACES[query.trim().toLowerCase()] ?? null;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: { "content-type": "application/json", "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY, "X-Goog-FieldMask": "places.displayName,places.location" },
    body: JSON.stringify({ textQuery: query, regionCode: "IN", pageSize: 1 }),
  });
  const data = (await res.json()) as { places?: Array<{ displayName: { text: string }; location: { latitude: number; longitude: number } }> };
  const p = data.places?.[0];
  return p ? { name: p.displayName.text, lat: p.location.latitude, lng: p.location.longitude } : null;
}

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371, rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function fallbackRoute(o: LatLng, d: LatLng): RouteInfo {
  const straight = haversineKm(o, d);
  const hilly = Math.max(o.lat, d.lat) > 30.5; // rough: Himalayan foothills and above
  const distanceKm = straight * (hilly ? 1.75 : 1.3);
  return { distanceKm: round1(distanceKm), durationMin: Math.round((distanceKm / (hilly ? 32 : 55)) * 60), tollsInr: Math.round(distanceKm * 0.9), polyline: null, hillRoute: hilly };
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Offline seed so local development works without a Maps key. */
const KNOWN_PLACES: Record<string, LatLng & { name: string }> = {
  shimla: { name: "Shimla", lat: 31.1048, lng: 77.1734 },
  chandigarh: { name: "Chandigarh", lat: 30.7333, lng: 76.7794 },
  manali: { name: "Manali", lat: 32.2432, lng: 77.1892 },
  delhi: { name: "Delhi", lat: 28.6139, lng: 77.209 },
  solan: { name: "Solan", lat: 30.9045, lng: 77.0967 },
  dharamshala: { name: "Dharamshala", lat: 32.219, lng: 76.3234 },
};
