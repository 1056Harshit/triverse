// Swaps in the latest Privacy / Terms / Safety text from the API (editable in Supabase).
// The page is already readable from the copy baked in at build time, so failures are silent.
const me = document.currentScript ?? document.querySelector('script[src="/legal.js"]');
const id = me.dataset.doc, api = me.dataset.api;
const esc = (x) => String(x).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const rich = (x) => esc(x).replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>").replace(/([\w.+-]+@[\w-]+\.[\w.]+)/g, '<a href="mailto:$1">$1</a>');

try {
  const res = await fetch(`${api}/legal/${id}`, { signal: AbortSignal.timeout(60000) });
  if (res.ok) {
    const d = await res.json();
    const main = document.querySelector("main.doc");
    const links = main.querySelector(".doc-links")?.outerHTML ?? "";
    document.title = `${d.title} — TriVerse`;
    main.innerHTML = `<div class="doc-icon">${esc(d.icon)}</div><h1>${esc(d.title)}</h1><p class="updated">Last updated ${esc(d.updated)}</p>`
      + (d.intro ? `<p class="intro">${rich(d.intro)}</p>` : "")
      + (d.sections ?? []).map((s) => `<section class="doc-card"><h2>${esc(s.heading)}</h2>`
        + ((s.bullets ?? []).length ? `<ul>${s.bullets.map((b) => `<li>${rich(b)}</li>`).join("")}</ul>` : "")
        + (s.body ?? []).map((b) => `<p>${rich(b)}</p>`).join("") + `</section>`).join("")
      + links;
  }
} catch { /* keep the built-in copy */ }
