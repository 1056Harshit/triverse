// Regenerates every brand asset: node brand/export.js  (needs `sharp`)
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");
const b = require("./pin");

const out = (f) => path.join(__dirname, f);
const svgs = {
  "logo-lockup.svg": b.lockupSvg(),
  "logo-lockup-dark.svg": b.lockupSvg({ dark: true }),
  "mark.svg": b.markSvg(),
  "mark-dark.svg": b.markSvg({ dark: true }),
  "icon.svg": b.iconSvg(),
  "icon-dark.svg": b.iconSvg({ dark: true }),
  "icon-farm.svg": b.iconSvg({ mode: "farm" }),
  "icon-ride.svg": b.iconSvg({ mode: "ride" }),
  "icon-dine.svg": b.iconSvg({ mode: "dine" }),
};

const pngs = [
  // Expo app config assets
  ["png/icon.png", b.iconSvg({ rounded: false }), 1024],
  ["png/adaptive-icon.png", b.iconSvg({ rounded: false, padding: 0.3 }).replace(/<rect[^>]*\/>/, ""), 1024],
  ["png/splash-icon.png", b.markSvg(), 512],
  ["png/favicon.png", b.iconSvg(), 96],
  ["png/notification-icon.png", b.markSvg({ dark: true }), 96],
  ["png/logo-lockup.png", b.lockupSvg(), 1200],
  ["png/logo-lockup-dark.png", b.lockupSvg({ dark: true }), 1200],
  ["png/icon-farm.png", b.iconSvg({ mode: "farm" }), 512],
  ["png/icon-ride.png", b.iconSvg({ mode: "ride" }), 512],
  ["png/icon-dine.png", b.iconSvg({ mode: "dine" }), 512],
  // Email header mark (emails can't rely on SVG support)
  ["png/email-mark.png", b.markSvg(), 160],
];

(async () => {
  fs.mkdirSync(out("png"), { recursive: true });
  for (const [f, s] of Object.entries(svgs)) fs.writeFileSync(out(f), s);
  for (const [f, s, w] of pngs) await sharp(Buffer.from(s)).resize({ width: w }).png().toFile(out(f));
  console.log(`wrote ${Object.keys(svgs).length} svg + ${pngs.length} png`);
})();
