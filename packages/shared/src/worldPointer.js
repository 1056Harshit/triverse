// PvtFrnd world pointer: replaces the mouse arrow with a precise glowing dot plus a themed "buddy"
// (leaf, car, plate, heart, plane) that follows it, turns with your movement and leaves a trail.
// Plain ES module with no dependencies — used by the website and by the web app.

const WORLDS = {
  brand: { c: "#5B8EF5", trail: ["#22A35A", "#2F6FEB", "#F2643D"], kind: "dots" },
  farm: { c: "#22A35A", trail: ["🍃", "🌿", "🍂"], kind: "emoji" },
  ride: { c: "#2F6FEB", trail: ["#93C5FD", "#2F6FEB"], kind: "streak" },
  dine: { c: "#F2643D", trail: ["✨", "⭐"], kind: "emoji" },
  health: { c: "#0D9488", trail: ["❤", "✚"], kind: "glyph" },
  travel: { c: "#7C3AED", trail: ["☁️"], kind: "emoji" },
};

// White glyphs drawn in a 24×24 box; the car and plane point right (0°) so they can face the motion.
const ICONS = {
  brand: '<circle cx="12" cy="7" r="3.2" fill="#22A35A"/><circle cx="7" cy="16" r="3.2" fill="#2F6FEB"/><circle cx="17" cy="16" r="3.2" fill="#F2643D"/>',
  farm: '<path d="M4 20c0-9 5-14 16-14 0 10-5 14-16 14z" fill="#fff"/><path d="M5 19l9-9" stroke="#14703D" stroke-width="1.8" stroke-linecap="round"/>',
  ride: '<path d="M3 14.5l1.6-4.1c.4-1 1.3-1.6 2.3-1.6h7.7c.8 0 1.6.4 2.1 1.1l2.6 3.4 1.9.6c.5.2.8.6.8 1.1V17H3z" fill="#fff"/><circle cx="7.5" cy="17.2" r="2" fill="#1E4FB8" stroke="#fff" stroke-width="1.2"/><circle cx="17" cy="17.2" r="2" fill="#1E4FB8" stroke="#fff" stroke-width="1.2"/><path d="M8 9.6h4.6v3.2H6.8z" fill="#BFDBFE"/>',
  dine: '<path d="M8 3v7M5.5 3v5.2c0 1.6 1.1 2.6 2.5 2.6s2.5-1 2.5-2.6V3M8 10.6V21" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none"/><path d="M18 21V3c-2.6 1-3.8 3.6-3.8 7v2.2H18" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  health: '<path d="M12 20.5s-8-4.9-8-10.6C4 7.1 6 5 8.6 5c1.5 0 2.7.8 3.4 2 .7-1.2 1.9-2 3.4-2C18 5 20 7.1 20 9.9c0 5.7-8 10.6-8 10.6z" fill="#fff"/><path d="M6.5 12h3l1.3-2.6 2 5 1.4-2.4h3.3" stroke="#0F766E" stroke-width="1.5" fill="none" stroke-linejoin="round" stroke-linecap="round"/>',
  travel: '<path d="M2.5 12.6l7.2-.6 4.6-7.5h2.4l-2.3 7.3 5.3-.4 1.6-2.2h1.7l-1 3.3 1 3.3h-1.7l-1.6-2.2-5.3-.4 2.3 7.3h-2.4l-4.6-7.5-7.2-.6z" fill="#fff"/>',
};

const FACES_MOTION = new Set(["ride", "travel"]);

export function createWorldPointer(options = {}) {
  const noop = { setWorld() {}, destroy() {} };
  if (typeof window === "undefined" || typeof document === "undefined") return noop;
  if (!window.matchMedia?.("(hover: hover) and (pointer: fine)").matches) return noop; // phones/tablets keep touch
  if (document.querySelector(".tvp-root")) return window.__tvPointer ?? noop;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const style = document.createElement("style");
  style.textContent = `
html.tvp, html.tvp * { cursor: none !important; }
html.tvp input, html.tvp textarea, html.tvp select, html.tvp [contenteditable="true"] { cursor: text !important; }
.tvp-root { position: fixed; inset: 0; pointer-events: none; z-index: 2147483646; transition: opacity .25s; }
.tvp-root.hidden { opacity: 0; }
.tvp-dot { position: absolute; left: 0; top: 0; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%;
  background: var(--tvp-c); box-shadow: 0 0 0 2px #fff, 0 0 14px var(--tvp-c);
  transition: width .25s cubic-bezier(.2,.8,.2,1), height .25s cubic-bezier(.2,.8,.2,1), margin .25s cubic-bezier(.2,.8,.2,1), background .4s, box-shadow .3s, opacity .2s; }
.tvp-root.hover .tvp-dot { width: 46px; height: 46px; margin: -23px 0 0 -23px; background: color-mix(in srgb, var(--tvp-c) 20%, transparent); box-shadow: 0 0 0 2px var(--tvp-c), 0 0 26px var(--tvp-c); }
.tvp-root.down .tvp-dot { width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; }
.tvp-root.text .tvp-dot { opacity: 0; }
.tvp-buddy { position: absolute; left: 0; top: 0; width: 38px; height: 38px; margin: -19px 0 0 -19px; border-radius: 50%;
  display: grid; place-items: center; background: var(--tvp-c); border: 2px solid rgba(255,255,255,.9);
  box-shadow: 0 10px 22px -8px var(--tvp-c), 0 0 0 4px color-mix(in srgb, var(--tvp-c) 22%, transparent); transition: background .4s, box-shadow .4s; }
.tvp-buddy svg { width: 22px; height: 22px; transition: transform .15s; }
.tvp-root.hover .tvp-buddy { box-shadow: 0 10px 26px -6px var(--tvp-c), 0 0 0 7px color-mix(in srgb, var(--tvp-c) 28%, transparent); }
.tvp-p { position: absolute; left: 0; top: 0; pointer-events: none; will-change: transform, opacity; line-height: 1; }
.tvp-ring { position: absolute; left: 0; top: 0; width: 20px; height: 20px; margin: -10px 0 0 -10px; border-radius: 50%; border: 2px solid var(--tvp-c); }
`;
  document.head.appendChild(style);

  const root = document.createElement("div");
  root.className = "tvp-root hidden";
  root.setAttribute("aria-hidden", "true");
  root.innerHTML = '<div class="tvp-buddy"><svg viewBox="0 0 24 24"></svg></div><div class="tvp-dot"></div>';
  document.body.appendChild(root);
  document.documentElement.classList.add("tvp");
  const dot = root.querySelector(".tvp-dot");
  const buddy = root.querySelector(".tvp-buddy");
  const svg = buddy.querySelector("svg");

  let world = "brand";
  let x = innerWidth / 2, y = innerHeight / 2, bx = x, by = y, vx = 0, vy = 0, angle = 0, lastSpawn = 0, live = 0, raf = 0, seen = false;

  function setWorld(w) {
    const next = WORLDS[w] ? w : "brand";
    if (next === world && svg.innerHTML) return;
    world = next;
    root.style.setProperty("--tvp-c", WORLDS[world].c);
    svg.innerHTML = ICONS[world];
    if (!reduce) buddy.animate([{ transform: "scale(.4) rotate(-40deg)" }, { transform: "scale(1.25) rotate(8deg)" }, { transform: "scale(1)" }], { duration: 480, easing: "cubic-bezier(.2,.8,.2,1)" });
  }

  function spawn(px, py, speed) {
    if (reduce || live > 26) return;
    const w = WORLDS[world];
    const el = document.createElement("div");
    el.className = "tvp-p";
    const pick = w.trail[Math.floor(Math.random() * w.trail.length)];
    let frames, duration = 900 + Math.random() * 500;
    const jx = (Math.random() - 0.5) * 14, jy = (Math.random() - 0.5) * 14;
    if (w.kind === "dots") {
      const s = 4 + Math.random() * 5;
      el.style.cssText = `width:${s}px;height:${s}px;border-radius:50%;background:${pick};box-shadow:0 0 10px ${pick}`;
      frames = [{ transform: `translate(${px + jx}px,${py + jy}px) scale(1)`, opacity: 0.9 }, { transform: `translate(${px + jx * 3}px,${py + jy * 3 - 20}px) scale(0)`, opacity: 0 }];
    } else if (w.kind === "streak") {
      const len = Math.min(46, 10 + speed * 1.6);
      el.style.cssText = `width:${len}px;height:3px;border-radius:3px;background:linear-gradient(90deg,transparent,${pick})`;
      const a = Math.atan2(vy, vx) * 180 / Math.PI;
      frames = [{ transform: `translate(${px - len}px,${py + jy * 0.6}px) rotate(${a}deg)`, transformOrigin: "100% 50%", opacity: 0.85 }, { transform: `translate(${px - len - vx * 6}px,${py + jy * 0.6 - vy * 6}px) rotate(${a}deg)`, transformOrigin: "100% 50%", opacity: 0 }];
      duration = 420;
    } else {
      const size = 10 + Math.random() * 8;
      el.textContent = pick;
      el.style.cssText = `font-size:${size}px;color:${w.c}`;
      const fall = world === "farm" ? 70 + Math.random() * 60 : world === "travel" ? -10 : -40 - Math.random() * 30;
      const spin = world === "farm" ? (Math.random() - 0.5) * 540 : (Math.random() - 0.5) * 60;
      frames = [
        { transform: `translate(${px + jx}px,${py + jy}px) rotate(0deg) scale(.6)`, opacity: 0 },
        { transform: `translate(${px + jx * 1.5}px,${py + jy + fall * 0.3}px) rotate(${spin * 0.3}deg) scale(1)`, opacity: 0.95, offset: 0.2 },
        { transform: `translate(${px + jx * 3 + (world === "farm" ? Math.sin(px) * 30 : 0)}px,${py + jy + fall}px) rotate(${spin}deg) scale(${world === "travel" ? 1.6 : 0.7})`, opacity: 0 },
      ];
    }
    root.appendChild(el);
    live++;
    el.animate(frames, { duration, easing: "cubic-bezier(.2,.7,.3,1)" }).onfinish = () => { el.remove(); live--; };
  }

  function burst() {
    if (reduce) return;
    const ring = document.createElement("div");
    ring.className = "tvp-ring";
    root.appendChild(ring);
    ring.animate([{ transform: `translate(${x}px,${y}px) scale(.6)`, opacity: 0.9 }, { transform: `translate(${x}px,${y}px) scale(3.4)`, opacity: 0 }], { duration: 520, easing: "cubic-bezier(.2,.8,.2,1)" }).onfinish = () => ring.remove();
    for (let i = 0; i < 6; i++) spawn(x, y, 8);
  }

  const INTERACTIVE = 'a, button, [role="button"], [role="link"], [role="tab"], [role="switch"], [role="checkbox"], [tabindex="0"], summary, label, select, .card, .world-chips li';
  const TEXT = 'input, textarea, [contenteditable="true"]';
  const onMove = (e) => {
    x = e.clientX; y = e.clientY;
    if (!seen) { seen = true; bx = x; by = y; }
    root.classList.remove("hidden");
  };
  const onOver = (e) => {
    const t = e.target instanceof Element ? e.target : null;
    root.classList.toggle("hover", !!t?.closest(INTERACTIVE));
    root.classList.toggle("text", !!t?.closest(TEXT));
  };
  const onDown = () => { root.classList.add("down"); burst(); };
  const onUp = () => root.classList.remove("down");
  const onLeave = () => root.classList.add("hidden");
  addEventListener("pointermove", onMove, { passive: true });
  addEventListener("pointerover", onOver, { passive: true });
  addEventListener("pointerdown", onDown, { passive: true });
  addEventListener("pointerup", onUp, { passive: true });
  document.documentElement.addEventListener("pointerleave", onLeave);

  function tick(now) {
    // The buddy trails the dot with a soft spring and sits just below-right of it.
    const tx = x + 24, ty = y + 22;
    vx = reduce ? 0 : (tx - bx) * 0.16; vy = reduce ? 0 : (ty - by) * 0.16;
    bx = reduce ? tx : bx + vx; by = reduce ? ty : by + vy;
    const speed = Math.hypot(vx, vy);
    let rot = 0;
    if (!reduce) {
      if (FACES_MOTION.has(world)) {
        if (speed > 0.6) {
          const target = Math.atan2(vy, vx) * 180 / Math.PI;
          let d = ((target - angle + 540) % 360) - 180;
          angle += d * 0.2;
        }
        rot = angle;
      } else if (world === "farm") rot = Math.sin(now / 420) * 14 + vx * 2;
      else if (world === "dine") rot = Math.sin(now / 300) * 6 + vx * 1.5;
      else if (world === "brand") rot = (now / 18) % 360;
    }
    const beat = world === "health" && !reduce ? 1 + Math.max(0, Math.sin(now / 160)) ** 8 * 0.18 : 1;
    // The car and plane are drawn facing right; flip vertically when heading left so they stay upright.
    const flip = FACES_MOTION.has(world) && Math.abs(((rot % 360) + 540) % 360 - 180) < 90 ? -1 : 1;
    svg.style.transform = `rotate(${rot}deg) scale(${beat}, ${beat * flip})`;
    dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    buddy.style.transform = `translate3d(${bx}px, ${by}px, 0)`;
    if (speed > 1.2 && now - lastSpawn > (world === "ride" ? 28 : 55)) { lastSpawn = now; spawn(bx, by, speed); }
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);
  setWorld(options.world ?? "brand");

  const api = {
    setWorld,
    destroy() {
      cancelAnimationFrame(raf);
      removeEventListener("pointermove", onMove); removeEventListener("pointerover", onOver);
      removeEventListener("pointerdown", onDown); removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      document.documentElement.classList.remove("tvp");
      root.remove(); style.remove();
      window.__tvPointer = undefined;
    },
  };
  window.__tvPointer = api;
  return api;
}
