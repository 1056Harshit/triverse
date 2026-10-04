import { BRAND, SERVICES, type ServiceId } from "@triverse/shared";

/** Public base URL for hosted email images (copy brand/png to your CDN). */
export const ASSET_BASE = process.env.EMAIL_ASSET_BASE ?? "https://pvtfrnd.com/brand";
export const APP_URL = process.env.APP_URL ?? "https://pvtfrnd.com";

export type Accent = ServiceId | "brand";

export function accent(a: Accent) {
  if (a === "brand") return { primary: BRAND.blue, deep: BRAND.navy, tint: "#EEF3FF" };
  const s = SERVICES[a];
  return { primary: s.primary, deep: s.deep, tint: s.tint };
}

export const font =
  "Poppins, 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif";

export function greeting(date = new Date(), tz = "Asia/Kolkata"): string {
  const h = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: tz }).format(date));
  if (h < 5) return "Up late";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
