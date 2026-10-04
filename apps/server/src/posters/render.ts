import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { BRAND, SERVICES, type ServiceId } from "@triverse/shared";

import { putObject } from "../storage/index.ts";

export type PosterStyle = "spotlight" | "minimal" | "festive";
export type PosterFormat = "portrait" | "square" | "landscape" | "story";

export interface PosterSpec {
  service: ServiceId;
  style: PosterStyle;
  format: PosterFormat;
  eyebrow?: string;
  headline: string;
  subline?: string;
  offer?: string;
  cta: string;
  footnote?: string;
}

const SIZES: Record<PosterFormat, [number, number]> = { portrait: [1080, 1350], square: [1080, 1080], landscape: [1200, 628], story: [1080, 1920] };
const PIN = "M70 145 C50 115 28 100 28 75 A42 42 0 1 1 112 75 C112 100 90 115 70 145 Z";
const FONT = "Poppins, 'DejaVu Sans', Arial, sans-serif";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);

function wrap(text: string, fontSize: number, maxWidth: number, maxLines: number): string[] {
  const perLine = Math.max(6, Math.floor(maxWidth / (fontSize * 0.56)));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    if ((cur + " " + w).trim().length > perLine) { if (cur) lines.push(cur); cur = w; } else cur = (cur + " " + w).trim();
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) { lines.length = maxLines; lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "…"); }
  return lines;
}

function textBlock(lines: string[], x: number, y: number, size: number, color: string, weight = 700, lh = 1.12): string {
  return `<text x="${x}" y="${y}" font-family="${FONT}" font-size="${size}" font-weight="${weight}" fill="${color}">${lines
    .map((l, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : size * lh}">${esc(l)}</tspan>`).join("")}</text>`;
}

function logo(x: number, y: number, scale: number, onDark: boolean): string {
  const pin = onDark ? "#FFFFFF" : BRAND.navy, hole = onDark ? BRAND.navy : "#FFFFFF";
  return `<g transform="translate(${x},${y}) scale(${scale})"><path d="${PIN}" fill="${pin}"/><circle cx="70" cy="75" r="30" fill="${hole}"/>
  <circle cx="70" cy="62" r="9" fill="#22A35A"/><circle cx="58" cy="84" r="9" fill="#2F6FEB"/><circle cx="82" cy="84" r="9" fill="#F2643D"/></g>
  <text x="${x + 130 * scale}" y="${y + 92 * scale}" font-family="${FONT}" font-size="${44 * scale}" font-weight="700" fill="${onDark ? "#FFFFFF" : BRAND.navy}">Tri<tspan fill="${onDark ? "#9DB8FF" : BRAND.blue}">Verse</tspan></text>`;
}

export function posterSvg(s: PosterSpec): string {
  const [W, H] = SIZES[s.format];
  const svc = SERVICES[s.service];
  const dark = s.style !== "minimal";
  const bg = s.style === "spotlight" ? svc.deep : s.style === "festive" ? BRAND.ink : "#FFFFFF";
  const fg = dark ? "#FFFFFF" : BRAND.ink;
  const pad = Math.round(W * 0.08);
  const wide = s.format === "landscape";
  // Flow layout: every block advances a y cursor, so nothing can overlap.
  const hSize = Math.round(wide ? H * 0.1 : W * 0.088);
  const subSize = Math.round(hSize * (wide ? 0.42 : 0.4));
  const headline = wrap(s.headline, hSize, W * (wide ? 0.68 : 0.84), 3);
  const sub = s.subline ? wrap(s.subline, subSize, W * (wide ? 0.6 : 0.8), 2) : [];
  let y = Math.round(wide ? pad * 0.9 : H * 0.16);

  const deco = s.style === "spotlight"
    ? `<circle cx="${W * 0.92}" cy="${H * 0.08}" r="${W * 0.32}" fill="${svc.primary}" opacity="0.55"/><circle cx="${W * 0.05}" cy="${H * 0.98}" r="${W * 0.24}" fill="${svc.primary}" opacity="0.35"/>`
    : s.style === "festive"
      ? Array.from({ length: 36 }, (_, i) => `<circle cx="${W * 0.52 + ((i * 197) % (W * 0.46))}" cy="${(i * 331) % (H * 0.55)}" r="${3 + (i % 4) * 2}" fill="${[BRAND.gold, svc.primary, "#FFFFFF"][i % 3]}" opacity="${0.35 + (i % 3) * 0.2}"/>`).join("")
      : `<rect x="0" y="0" width="${W}" height="${H * 0.018}" fill="${svc.primary}"/><circle cx="${W * 0.88}" cy="${H * 0.2}" r="${W * 0.18}" fill="${svc.tint}"/>`;

  let eyebrow = "";
  if (s.eyebrow) {
    const eh = Math.round(hSize * 0.6), es = Math.round(hSize * 0.3);
    eyebrow = `<rect x="${pad}" y="${y}" rx="${eh / 2}" width="${s.eyebrow.length * es * 0.9 + 48}" height="${eh}" fill="${dark ? "rgba(255,255,255,0.16)" : svc.tint}"/>
    <text x="${pad + 24}" y="${y + eh * 0.68}" font-family="${FONT}" font-size="${es}" font-weight="700" letter-spacing="3" fill="${dark ? "#FFFFFF" : svc.deep}">${esc(s.eyebrow.toUpperCase())}</text>`;
    y += eh + hSize * 0.5;
  }
  y += hSize * 0.85;
  const headlineSvg = textBlock(headline, pad, y, hSize, fg);
  y += (headline.length - 1) * hSize * 1.12 + hSize * 0.75;
  let subSvg = "";
  if (sub.length) {
    y += subSize;
    subSvg = textBlock(sub, pad, y, subSize, dark ? "rgba(255,255,255,0.85)" : "#475569", 500, 1.4);
    y += (sub.length - 1) * subSize * 1.4 + subSize * 0.9;
  }
  const btnH = Math.round(hSize * (wide ? 0.85 : 0.9));
  let offer = "";
  if (s.offer) {
    const os = Math.round(btnH * 0.46);
    offer = `<rect x="${pad}" y="${y}" rx="18" width="${Math.min(W - pad * 2, s.offer.length * os * 0.62 + 80)}" height="${btnH}" fill="${s.style === "festive" ? BRAND.gold : dark ? "#FFFFFF" : svc.primary}"/>
    <text x="${pad + 40}" y="${y + btnH * 0.66}" font-family="${FONT}" font-size="${os}" font-weight="800" fill="${s.style === "festive" ? BRAND.ink : dark ? svc.deep : "#FFFFFF"}">${esc(s.offer)}</text>`;
    y += btnH + hSize * 0.35;
  }
  const cs = Math.round(btnH * 0.42);
  const ctaY = wide ? y : Math.max(y, H - pad - btnH - hSize * 1.4);
  const ctaW = s.cta.length * cs * 0.62 + 120;
  const cta = `<rect x="${pad}" y="${ctaY}" rx="${btnH / 2}" width="${ctaW}" height="${btnH}" fill="${dark ? svc.primary : BRAND.ink}"/>
    <text x="${pad + 44}" y="${ctaY + btnH * 0.66}" font-family="${FONT}" font-size="${cs}" font-weight="700" fill="#FFFFFF">${esc(s.cta)}  →</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${bg}"/>${deco}${eyebrow}
  ${headlineSvg}
  ${subSvg}
  ${offer}${cta}
  ${logo(wide ? W - pad - 190 : pad, H - pad - 64, 0.48, dark)}
  ${s.footnote ? `<text x="${W - pad}" y="${H - pad * 0.45}" text-anchor="end" font-family="${FONT}" font-size="${Math.round(W * 0.016)}" fill="${dark ? "rgba(255,255,255,0.6)" : "#94A3B8"}">${esc(s.footnote)}</text>` : ""}
  </svg>`;
}

export async function renderPoster(s: PosterSpec): Promise<{ url: string; key: string }> {
  const key = `${s.service}-${s.style}-${s.format}-${randomUUID().slice(0, 8)}.png`;
  const url = await putObject(`posters/${key}`, await sharp(Buffer.from(posterSvg(s))).png().toBuffer(), "image/png");
  return { url, key };
}
