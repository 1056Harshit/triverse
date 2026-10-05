import { SERVICES, type ServiceId } from "./services.ts";

/**
 * Custom mouse cursors for the web: one look per world, shared by the website and the web app.
 * Each is a classic arrow (hotspot at the tip, 3,2) in the world's colour with a small badge,
 * so pointing stays precise. The "pointer" variant (over links/buttons) adds a glowing ring.
 */
export type CursorWorld = ServiceId | "brand";
export const CURSOR_HOTSPOT = { x: 3, y: 2 } as const;

const BRAND = { primary: "#1E3A8A", deep: "#172554" };

/** Badge glyphs drawn inside a 32×32 box, centred on (23.5, 23.5). */
const GLYPH: Record<CursorWorld, string> = {
  brand: `<circle cx="23.5" cy="20.5" r="2.1" fill="#22A35A"/><circle cx="20.6" cy="25.6" r="2.1" fill="#2F6FEB"/><circle cx="26.4" cy="25.6" r="2.1" fill="#F2643D"/>`,
  farm: `<path d="M19 28c0-6 3.5-9 9-9 0 5.8-3.4 9-9 9z" fill="#fff"/><path d="M19.6 27.4l5.4-5.6" stroke="#14703D" stroke-width="1.3" stroke-linecap="round"/>`,
  ride: `<path d="M18.6 25.4l1.4-3.6c.3-.7.9-1.1 1.6-1.1h3.8c.7 0 1.3.4 1.6 1.1l1.4 3.6v2.4h-9.8z" fill="#fff"/><circle cx="20.9" cy="27.6" r="1.3" fill="#1E4FB8"/><circle cx="26.1" cy="27.6" r="1.3" fill="#1E4FB8"/>`,
  dine: `<path d="M20.3 18.8v4.4M18.9 18.8v3.3c0 1 .6 1.6 1.4 1.6s1.4-.6 1.4-1.6v-3.3M20.3 23.2v5.2" stroke="#fff" stroke-width="1.3" stroke-linecap="round" fill="none"/><path d="M26.4 28.4v-9.6c-1.6.6-2.4 2.3-2.4 4.4v1.4h2.4" stroke="#fff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`,
  health: `<path d="M22 18.8h3v3.2h3.2v3h-3.2v3.2h-3v-3.2h-3.2v-3h3.2z" fill="#fff"/>`,
  travel: `<path d="M18.6 23.2l9.8-4.4-3.2 9.6-2-3.6z" fill="#fff"/><path d="M23.2 24.8l5.2-6" stroke="#5B21B6" stroke-width="1.1"/>`,
};

function colours(world: CursorWorld) {
  return world === "brand" ? BRAND : { primary: SERVICES[world].primary, deep: SERVICES[world].deep };
}

/** Raw SVG markup for a world's cursor. */
export function cursorSvg(world: CursorWorld, variant: "default" | "pointer" = "default"): string {
  const c = colours(world);
  const pointer = variant === "pointer";
  const arrowFill = pointer ? "#FFFFFF" : c.primary;
  const arrowStroke = pointer ? c.primary : "#FFFFFF";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">`
    + (pointer ? `<circle cx="23.5" cy="23.5" r="8.4" fill="${c.primary}" opacity=".28"/>` : "")
    + `<path d="M3 2v17.6l4.6-4.3 3.1 7.1 3.1-1.4-3.1-6.9h6.4z" fill="${arrowFill}" stroke="${arrowStroke}" stroke-width="1.5" stroke-linejoin="round"/>`
    + `<circle cx="23.5" cy="23.5" r="${pointer ? 6.9 : 6.4}" fill="${world === "brand" ? "#FFFFFF" : c.deep}" stroke="#FFFFFF" stroke-width="1.4"/>`
    + GLYPH[world]
    + `</svg>`;
}

/** CSS `cursor` value (data URI + hotspot + fallback). */
export function cursorCss(world: CursorWorld, variant: "default" | "pointer" = "default"): string {
  const uri = `data:image/svg+xml;utf8,${encodeURIComponent(cursorSvg(world, variant))}`;
  return `url("${uri}") ${CURSOR_HOTSPOT.x} ${CURSOR_HOTSPOT.y}, ${variant === "pointer" ? "pointer" : "auto"}`;
}

/** A stylesheet that applies a world's cursors to a whole page (or to `scope`). */
export function cursorStylesheet(world: CursorWorld, scope = ""): string {
  const s = (sel: string) => sel.split(",").map((x) => `${scope} ${x.trim()}`.trim()).join(", ");
  return `${s("html, body, *")} { cursor: ${cursorCss(world)} !important; }
${s('a, button, [role="button"], [role="link"], [role="tab"], [role="switch"], [role="checkbox"], [tabindex="0"], summary, label, select')} { cursor: ${cursorCss(world, "pointer")} !important; }
${s('input, textarea, [contenteditable="true"]')} { cursor: text !important; }`;
}
