// Builds the website into dist/: the landing pages, per-world cursor files, and the web app under /app.
import { cpSync, rmSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { LEGAL_CONTACT, LEGAL_DOCS, LEGAL_ORDER, type LegalDoc } from "../../packages/shared/src/legal.ts";

const root = new URL(".", import.meta.url).pathname;
const dist = `${root}dist`;

rmSync(dist, { recursive: true, force: true });
cpSync(`${root}src`, dist, { recursive: true });

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://triverse-api.onrender.com";

// Privacy, terms, safety and delete-account pages from the same text the app shows.
const esc = (x: string) => x.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rich = (x: string) => esc(x).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(new RegExp(LEGAL_CONTACT.replace(".", "\\."), "g"), `<a href="mailto:${LEGAL_CONTACT}">${LEGAL_CONTACT}</a>`);
const legalPage = (d: LegalDoc) => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${esc(d.title)} — TriVerse</title>
  <meta name="description" content="${esc(d.summary)}" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@700;800&family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
</head>
<body data-world="brand">
  <header class="nav">
    <a class="logo" href="/"><img src="/favicon.svg" alt="" width="26" height="32" /><span>TriVerse</span></a>
    <a class="btn btn-small" style="margin-left:auto" href="/app/">Open app</a>
  </header>
  <main class="doc">
    <div class="doc-icon">${d.icon}</div>
    <h1>${esc(d.title)}</h1>
    <p class="updated">Last updated ${d.updated}</p>
    ${d.intro ? `<p class="intro">${rich(d.intro)}</p>` : ""}
${d.sections.map((s) => `    <section class="doc-card">
      <h2>${esc(s.heading)}</h2>
${(s.bullets ?? []).length ? `      <ul>${s.bullets!.map((b) => `<li>${rich(b)}</li>`).join("")}</ul>\n` : ""}${(s.body ?? []).map((b) => `      <p>${rich(b)}</p>`).join("\n")}
    </section>`).join("\n")}
    <nav class="doc-links">${LEGAL_ORDER.filter((id) => id !== d.id).map((id) => `<a href="/${id}.html">${LEGAL_DOCS[id].icon} ${esc(LEGAL_DOCS[id].title)}</a>`).join("")}</nav>
  </main>
  <footer class="footer">
    <nav aria-label="Legal"><a href="/">Home</a>${LEGAL_ORDER.map((id) => `<a href="/${id}.html">${esc(LEGAL_DOCS[id].title)}</a>`).join("")}</nav>
    <small>© 2026 TriVerse · pvtfrnd.com</small>
  </footer>
  <script type="module">import { createWorldPointer } from "/world-pointer.js"; createWorldPointer();</script>
  <script type="module" src="/legal.js" data-doc="${d.id}" data-api="${API_URL}"></script>
</body>
</html>
`;
for (const id of LEGAL_ORDER) writeFileSync(`${dist}/${id}.html`, legalPage(LEGAL_DOCS[id]));

// The animated world pointer (replaces the mouse arrow) — same module the web app uses.
cpSync(`${root}../../packages/shared/src/worldPointer.js`, `${dist}/world-pointer.js`);

if (!process.argv.includes("--site-only")) {
  // The full TriVerse app for the browser, served at /app.
  execSync(`npx expo export -p web --output-dir ${dist}/app`, {
    cwd: `${root}../mobile`, stdio: "inherit",
    env: { ...process.env, EXPO_BASE_URL: "/app", EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL ?? "https://triverse-api.onrender.com" },
  });
}
console.log(`Built ${dist}`);
