/**
 * Real landscape photos for dashboard banners, from Wikimedia Commons (free licences, credited).
 * Cached for a day so we stay a polite API citizen.
 */
export interface HeroPhoto { url: string; credit: string; license: string; page: string }

const QUERIES: Record<string, string[]> = {
  farm: ["terrace farming Himachal", "apple orchard Himachal Pradesh", "Farming in Lahaul", "rice terraces Uttarakhand"],
  ride: ["Manali Leh highway", "Himalayan highway road India", "mountain road Himachal Pradesh", "Chandigarh Manali highway"],
  travel: ["Key Monastery Spiti", "Solang Valley", "Parvati Valley Kasol", "McLeod Ganj Dharamshala"],
};

const UA = "PvtFrnd/1.0 (https://pvtfrnd.com)";
const cache = new Map<string, { at: number; photos: HeroPhoto[] }>();

export async function heroPhotos(service: string): Promise<HeroPhoto[]> {
  const qs = QUERIES[service];
  if (!qs) return [];
  const hit = cache.get(service);
  if (hit && Date.now() - hit.at < 24 * 3600_000) return hit.photos;

  // Two per query keeps the slideshow varied (different places, not five shots of one).
  const results = await Promise.all(qs.map((q) => search(q).then((r) => r.slice(0, 2)).catch(() => [])));
  // Travel shouldn't repeat the road photos used for Ride.
  const seen = new Set<string>(service === "travel" ? (cache.get("ride")?.photos ?? []).map((p) => p.url) : []);
  const photos = results.flat().filter((p) => !seen.has(p.url) && (seen.add(p.url), true)).slice(0, 8);
  if (photos.length) cache.set(service, { at: Date.now(), photos });
  return photos;
}

async function search(q: string): Promise<HeroPhoto[]> {
  const url = new URL("https://commons.wikimedia.org/w/api.php");
  Object.entries({
    action: "query", format: "json", generator: "search", gsrsearch: `filetype:bitmap ${q}`, gsrnamespace: "6", gsrlimit: "8",
    prop: "imageinfo", iiprop: "url|size|mime|extmetadata", iiurlwidth: "1400", iiextmetadatafilter: "Artist|LicenseShortName",
  }).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url, { headers: { "user-agent": UA }, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`commons ${res.status}`);
  const data = (await res.json()) as { query?: { pages?: Record<string, { title: string; imageinfo?: Array<{ thumburl?: string; width: number; height: number; mime: string; descriptionurl: string; extmetadata?: Record<string, { value: string }> }> }> } };
  return Object.values(data.query?.pages ?? {})
    .map((p) => ({ p, ii: p.imageinfo?.[0] }))
    // Landscape JPEGs only; skip maps, logos and diagrams.
    .filter(({ p, ii }) => ii?.thumburl && ii.mime === "image/jpeg" && ii.width >= ii.height * 1.25 && !/map|logo|diagram|chart|sign|highway|road/i.test(q.includes("road") || q.includes("highway") ? p.title.replace(/highway|road/gi, "") : p.title))
    .map(({ ii }) => ({
      url: ii!.thumburl!,
      credit: (ii!.extmetadata?.Artist?.value ?? "Wikimedia Commons").replace(/<[^>]+>/g, "").trim().slice(0, 60) || "Wikimedia Commons",
      license: ii!.extmetadata?.LicenseShortName?.value ?? "",
      page: ii!.descriptionurl,
    }));
}
