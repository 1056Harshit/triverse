// Builds the website into dist/: the landing pages, per-world cursor files, and the web app under /app.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { cursorStylesheet, cursorSvg, type CursorWorld } from "../../packages/shared/src/cursors.ts";

const root = new URL(".", import.meta.url).pathname;
const dist = `${root}dist`;
const worlds: CursorWorld[] = ["brand", "farm", "ride", "dine", "health", "travel"];

rmSync(dist, { recursive: true, force: true });
cpSync(`${root}src`, dist, { recursive: true });

// Cursors: one stylesheet scoped by the world currently on screen, plus the raw SVGs.
mkdirSync(`${dist}/cursors`, { recursive: true });
for (const w of worlds) {
  writeFileSync(`${dist}/cursors/${w}.svg`, cursorSvg(w));
  writeFileSync(`${dist}/cursors/${w}-pointer.svg`, cursorSvg(w, "pointer"));
}
const css = ["@media (hover: hover) and (pointer: fine) {", ...worlds.map((w) => cursorStylesheet(w, `body[data-world="${w}"]`)), "}"].join("\n");
writeFileSync(`${dist}/cursors.css`, css);

if (!process.argv.includes("--site-only")) {
  // The full TriVerse app for the browser, served at /app.
  execSync(`npx expo export -p web --output-dir ${dist}/app`, {
    cwd: `${root}../mobile`, stdio: "inherit",
    env: { ...process.env, EXPO_BASE_URL: "/app", EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://triverse-api.onrender.com" },
  });
}
console.log(`Built ${dist}`);
