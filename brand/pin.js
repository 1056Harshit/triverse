// Single source of truth for the PvtFrnd pin mark. Used by the export script.
const PIN = "M70 145 C50 115 28 100 28 75 A42 42 0 1 1 112 75 C112 100 90 115 70 145 Z";
const C = { navy: "#1E3A8A", blue: "#2F6FEB", green: "#22A35A", coral: "#F2643D", ink: "#0F172A", line: "#CBD5E1" };
const MODES = {
  all: { pin: C.navy, bg: "#FFFFFF" },
  farm: { pin: "#14703D", bg: "#E8F6EE", active: "green" },
  ride: { pin: "#1E4FB8", bg: "#E8F0FD", active: "blue" },
  dine: { pin: "#B8401E", bg: "#FDEDE7", active: "coral" },
};
function dots(active, dark) {
  const d = [
    ["green", 70, 62, dark ? "#34C474" : C.green],
    ["blue", 58, 84, dark ? "#5B8EF5" : C.blue],
    ["coral", 82, 84, dark ? "#F7825F" : C.coral],
  ];
  return d.map(([k, x, y, f]) =>
    !active ? `<circle cx="${x}" cy="${y}" r="9" fill="${f}"/>`
    : k === active ? `<circle cx="${x}" cy="${y}" r="13" fill="${f}"/>`
    : `<circle cx="${x}" cy="${y}" r="8" fill="${f}" opacity="0.25"/>`).join("");
}
function mark({ mode = "all", dark = false, triangle = true } = {}) {
  const m = MODES[mode];
  const pin = dark ? "#FFFFFF" : m.pin;
  const hole = dark ? C.ink : "#FFFFFF";
  const tri = triangle && mode === "all" ? `<polygon points="70,62 58,84 82,84" fill="none" stroke="${dark ? "#334155" : C.line}" stroke-width="3" stroke-linejoin="round"/>` : "";
  return `<path d="${PIN}" fill="${pin}"/><circle cx="70" cy="75" r="30" fill="${hole}"/>${tri}${dots(m.active, dark)}`;
}
// Mark cropped to its bounds (x 28..112, y 33..145) and centred in a square.
function markSvg(opts) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="14 19 112 140">${mark(opts)}</svg>`;
}
function iconSvg({ mode = "all", dark = false, size = 1024, padding = 0.18, rounded = true } = {}) {
  const bg = dark ? C.ink : MODES[mode].bg;
  const inner = size * (1 - padding * 2);
  const s = inner / 140, tx = (size - 112 * s) / 2 - 14 * s, ty = (size - 140 * s) / 2 - 19 * s;
  const r = rounded ? size * 0.22 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${r}" fill="${bg}"/><g transform="translate(${tx},${ty}) scale(${s})">${mark({ mode, dark })}</g></svg>`;
}
function lockupSvg({ dark = false } = {}) {
  // "Pvt" in ink, "Frnd" in the 3-colour brand gradient (green → blue → orange).
  const pvt = dark ? "#E8ECF5" : C.navy, sub = dark ? "#94A3B8" : "#64748B";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="360" viewBox="0 0 600 180">
<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="252" y1="0" x2="388" y2="0"><stop offset="0" stop-color="#22A35A"/><stop offset=".5" stop-color="#2F6FEB"/><stop offset="1" stop-color="#F2643D"/></linearGradient></defs>
<g transform="translate(10,8) scale(1.1)">${mark({ dark })}</g>
<text x="150" y="98" font-family="Poppins, 'Segoe UI', Arial, sans-serif" font-size="64" font-weight="700" letter-spacing="-1"><tspan fill="${pvt}">Pvt</tspan><tspan fill="url(#g)">Frnd</tspan></text>
<text x="154" y="134" font-family="Poppins, 'Segoe UI', Arial, sans-serif" font-size="20" fill="${sub}" letter-spacing="2">YOUR FRIEND FOR EVERYTHING</text></svg>`;
}
module.exports = { C, MODES, mark, markSvg, iconSvg, lockupSvg, PIN };
