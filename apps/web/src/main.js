// PvtFrnd website: 3D solar system of worlds, the animated world pointer, 3D tilt/parallax and scroll reveals.
import { createWorldPointer } from "/world-pointer.js";
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

const WORLDS = {
  brand: 0xc9ced6, farm: 0x4fb283, ride: 0x6f93ec, dine: 0xe5885f, health: 0x45b3ad, travel: 0x8e7ee6,
};

/* ---------- Split the hero title into letters for the 3D entrance ---------- */
// Letters in a .grad-text line are coloured one by one along the brand gradient (green → blue → orange),
// because a clipped background gradient can't follow letters that animate on their own.
const GRAD = [[0x22, 0xa3, 0x5a], [0x2f, 0x6f, 0xeb], [0xf2, 0x64, 0x3d]];
const gradAt = (t) => {
  const seg = t < 0.5 ? 0 : 1, k = t < 0.5 ? t / 0.5 : (t - 0.5) / 0.5;
  const [a, b] = [GRAD[seg], GRAD[seg + 1]];
  return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * k)).join(",")})`;
};
let letter = 0;
document.querySelectorAll(".split").forEach((el) => {
  const grad = el.classList.contains("grad-text");
  if (grad) el.classList.remove("grad-text");
  const chars = [...el.textContent];
  const n = chars.filter((c) => c !== " ").length;
  let k = 0;
  el.innerHTML = chars.map((c) => {
    if (c === " ") return " ";
    const color = grad ? `;color:${gradAt(k++ / Math.max(n - 1, 1))}` : "";
    return `<span class="ch" style="--i:${letter++}${color}">${c}</span>`;
  }).join("");
});

/* ---------- Reveal on scroll ---------- */
const revealer = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add("in"); revealer.unobserve(e.target); }
}, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
document.querySelectorAll(".reveal").forEach((el) => {
  const siblings = [...el.parentElement.children].filter((c) => c.classList.contains("reveal"));
  el.style.setProperty("--d", `${siblings.indexOf(el) * 90}ms`);
  revealer.observe(el);
});

/* ---------- The mouse becomes a glowing dot with a themed buddy (leaf, car, plate, heart, plane) ---------- */
const pointer = createWorldPointer({ world: "brand" });

/* ---------- Current world: drives colours and the pointer ---------- */
let currentWorld = "brand";
const onWorld = new Set();
const worldWatcher = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      currentWorld = e.target.dataset.world || "brand";
      document.body.dataset.world = currentWorld;
      pointer.setWorld(currentWorld);
      onWorld.forEach((fn) => fn(currentWorld));
    }
  }
}, { rootMargin: "-45% 0px -45% 0px" });
document.querySelectorAll("main > section[data-world], footer[data-world]").forEach((s) => worldWatcher.observe(s));

/* ---------- 3D tilt + depth parallax on stages and cards ---------- */
if (finePointer && !reduceMotion) {
  document.querySelectorAll(".tilt").forEach((el) => {
    const layers = [...el.querySelectorAll("[data-depth]")];
    const card = el.classList.contains("card");
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      if (card) { el.style.transform = `rotateY(${px * 14}deg) rotateX(${-py * 14}deg) translateZ(10px)`; return; }
      for (const l of layers) {
        const d = Number(l.dataset.depth);
        l.style.transform = d === 0
          ? `rotateY(${px * 22}deg) rotateX(${-py * 18}deg)`
          : `translate3d(${px * d * 0.6}px, ${py * d * 0.6}px, ${d}px)`;
      }
    });
    el.addEventListener("pointerleave", () => {
      if (card) el.style.transform = "";
      for (const l of layers) l.style.transform = "";
    });
  });
}

/* ---------- Typed assistant reply ---------- */
document.querySelectorAll(".typed").forEach((el) => {
  const text = el.dataset.text;
  if (reduceMotion) { el.textContent = text; return; }
  const io = new IntersectionObserver(([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    let i = 0;
    const t = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(t); }, 22);
  }, { threshold: 0.6 });
  io.observe(el);
});

/* ---------- Hero: the PvtFrnd solar system ---------- */
// The PvtFrnd pin glows at the centre; the five worlds orbit it as planets. Hover a planet to
// enlarge it (the pointer takes on that world), click it to jump to its section.
startUniverse().catch(() => { /* no WebGL: the CSS glow behind the hero still looks fine */ });

async function startUniverse() {
  const canvas = document.getElementById("globe");
  const labels = document.getElementById("planet-labels");
  const THREE = await import("three");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
  camera.position.set(0, 0, 13);

  const system = new THREE.Group();
  scene.add(system);
  scene.add(new THREE.AmbientLight(0xc9ced6, 0.55));
  const sun = new THREE.PointLight(0xfff1d6, 60, 30, 1.6);
  system.add(sun);
  const rimLight = new THREE.DirectionalLight(0xdfe3ea, 1.1);
  rimLight.position.set(-6, 5, 4);
  scene.add(rimLight);

  // Soft round glow texture for halos and nebulae.
  const glowTex = (() => {
    const c = document.createElement("canvas"); c.width = c.height = 128;
    const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.25, "rgba(255,255,255,.55)"); r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const halo = (color, size, opacity = 0.8) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.scale.setScalar(size); return s;
  };

  // --- The PvtFrnd pin (the "sun") ---
  const pin = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(0, -1.25);
  shape.bezierCurveTo(-0.35, -0.7, -0.78, -0.35, -0.78, 0.15);
  shape.absarc(0, 0.15, 0.78, Math.PI, 0, true);
  shape.bezierCurveTo(0.78, -0.35, 0.35, -0.7, 0, -1.25);
  const pinBody = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, { depth: 0.32, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 6, curveSegments: 48 }),
    new THREE.MeshStandardMaterial({ color: 0x2747b8, metalness: 0.45, roughness: 0.28, emissive: 0x112266, emissiveIntensity: 0.6 }),
  );
  pinBody.geometry.center();
  const face = new THREE.Mesh(new THREE.CircleGeometry(0.52, 48), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  face.position.set(0, 0.32, 0.25);
  const tri = new THREE.Group();
  [[0, 0.19, 0x22a35a], [-0.19, -0.13, 0x2f6feb], [0.19, -0.13, 0xf2643d]].forEach(([x, y, c]) => {
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.11, 24, 24), new THREE.MeshStandardMaterial({ color: c, roughness: 0.3, emissive: c, emissiveIntensity: 0.35 }));
    b.position.set(x, y, 0.06); tri.add(b);
  });
  tri.position.copy(face.position);
  pin.add(pinBody, face, tri, halo(0x9aa3b2, 5.5, 0.32), halo(0xffffff, 2.2, 0.3));
  system.add(pin);

  // --- Five world planets ---
  const PLANETS = [
    { id: "farm", name: "Farm", emoji: "🌾", color: 0x4fb283, deep: 0x1f6b47, r: 0.46, orbit: 2.3, speed: 0.32, tilt: 0.15, phase: 0.2, ring: false },
    { id: "ride", name: "Ride", emoji: "🚗", color: 0x6f93ec, deep: 0x26489c, r: 0.52, orbit: 3.05, speed: 0.24, tilt: -0.12, phase: 1.6, ring: true },
    { id: "dine", name: "Dine & Stay", emoji: "🍽", color: 0xe5885f, deep: 0x9a4522, r: 0.5, orbit: 3.8, speed: 0.19, tilt: 0.1, phase: 3.1, ring: false },
    { id: "health", name: "Health", emoji: "🏥", color: 0x45b3ad, deep: 0x136b67, r: 0.42, orbit: 4.5, speed: 0.15, tilt: -0.08, phase: 4.4, ring: true },
    { id: "travel", name: "Travel", emoji: "✈️", color: 0x8e7ee6, deep: 0x4a3ba0, r: 0.55, orbit: 5.2, speed: 0.12, tilt: 0.06, phase: 5.5, ring: false },
  ];
  // Banded surface texture so each planet visibly spins.
  const bandTex = (a, b) => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 128;
    const g = c.getContext("2d");
    const ca = "#" + a.toString(16).padStart(6, "0"), cb = "#" + b.toString(16).padStart(6, "0");
    g.fillStyle = ca; g.fillRect(0, 0, 256, 128);
    for (let i = 0; i < 14; i++) {
      g.fillStyle = i % 2 ? cb : "rgba(255,255,255,.18)"; g.globalAlpha = 0.25 + Math.random() * 0.4;
      const y = Math.random() * 128, h = 4 + Math.random() * 14;
      g.beginPath(); g.moveTo(0, y);
      for (let x = 0; x <= 256; x += 16) g.lineTo(x, y + Math.sin(x / 30 + i) * 4);
      g.lineTo(256, y + h); g.lineTo(0, y + h); g.fill();
    }
    g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  };

  const planets = PLANETS.map((p) => {
    const orbitPlane = new THREE.Group();
    orbitPlane.rotation.x = p.tilt;
    system.add(orbitPlane);
    const path = new THREE.EllipseCurve(0, 0, p.orbit, p.orbit * 0.92).getPoints(160).map((v) => new THREE.Vector3(v.x, 0, v.y));
    orbitPlane.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(path),
      new THREE.LineBasicMaterial({ color: p.color, transparent: true, opacity: 0.22 })));
    const body = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.SphereGeometry(p.r, 48, 48),
      new THREE.MeshStandardMaterial({ map: bandTex(p.color, p.deep), roughness: 0.55, metalness: 0.1, emissive: p.deep, emissiveIntensity: 0.25 }));
    ball.rotation.z = 0.35;
    body.add(ball, halo(p.color, p.r * 5, 0.45));
    if (p.ring) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(p.r * 1.4, p.r * 2, 64),
        new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.45, side: THREE.DoubleSide }));
      ring.rotation.x = Math.PI / 2.4; body.add(ring);
    }
    const moon = new THREE.Mesh(new THREE.SphereGeometry(p.r * 0.22, 16, 16), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.8 }));
    body.add(moon);
    orbitPlane.add(body);

    const label = document.createElement("a");
    label.className = "planet-label"; label.href = `#${p.id}`;
    label.style.setProperty("--pc", "#" + p.color.toString(16).padStart(6, "0"));
    label.innerHTML = `<i></i>${p.emoji} ${p.name}`;
    labels.appendChild(label);
    const state = { ...p, body, ball, moon, label, angle: p.phase, scale: 1, hover: false };
    label.addEventListener("pointerenter", () => setHover(state));
    label.addEventListener("pointerleave", () => setHover(null));
    return state;
  });

  let hovered = null;
  function setHover(p) {
    if (hovered === p) return;
    hovered = p;
    for (const q of planets) { q.hover = q === p; q.label.classList.toggle("on", q.hover); }
    pointer.setWorld(p ? p.id : currentWorld);
  }

  // --- Stars in three depth layers + soft nebulae ---
  const starLayers = [0.5, 1, 1.7].map((depth, li) => {
    const n = 600, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) pos.set([(Math.random() - 0.5) * 70, (Math.random() - 0.5) * 40, -10 - Math.random() * 30 + li * 6], i * 3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.05 * (li + 1), color: 0xdbe4ff, transparent: true, opacity: 0.35 + li * 0.22, depthWrite: false, sizeAttenuation: true }));
    scene.add(pts); return { pts, depth };
  });
  [[0x3a3f48, -9, 4, 18], [0x2e333b, 8, -5, 16], [0x252930, -4, -8, 12], [0x3a3f48, 12, 7, 10]].forEach(([c, x, y, s]) => {
    const n = halo(c, s, 0.12); n.position.set(x, y, -18); scene.add(n);
  });

  // --- Layout ---
  const layout = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const wide = w > 960;
    system.position.set(wide ? 3.7 : 0, wide ? -0.2 : 3.2, 0);
    system.scale.setScalar(wide ? 0.82 : 0.6);
  };
  layout(); addEventListener("resize", layout);
  system.rotation.x = 0.42;

  // --- Interaction ---
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(-9, -9);
  let mx = 0, my = 0, sy = 0, visible = true;
  addEventListener("pointermove", (e) => {
    mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5;
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  }, { passive: true });
  canvas.parentElement.addEventListener("click", (e) => {
    if (hovered && !e.target.closest("a, button")) document.getElementById(hovered.id)?.scrollIntoView({ behavior: "smooth" });
  });
  addEventListener("scroll", () => { sy = scrollY; }, { passive: true });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; labels.style.visibility = visible ? "" : "hidden"; }).observe(canvas);

  const tmp = new THREE.Vector3();
  const clock = new THREE.Clock();
  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    const sp = Math.min(sy / innerHeight, 1);

    pin.position.y = Math.sin(t * 1.2) * 0.12;
    pin.rotation.y = Math.sin(t * 0.5) * 0.45 + mx * 0.6;
    system.rotation.x = 0.42 + sp * 0.5 - my * 0.15;
    system.rotation.y = mx * 0.25;

    // Raycast for hover (labels also trigger it).
    if (finePointer) {
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(planets.map((p) => p.ball), false)[0];
      const p = hit ? planets.find((q) => q.ball === hit.object) : null;
      if (p || (hovered && !hovered.label.matches(":hover"))) setHover(p ?? null);
    }

    const r = canvas.getBoundingClientRect();
    for (const p of planets) {
      const slow = p.hover ? 0.15 : 1;
      if (!reduceMotion) p.angle += dt * p.speed * slow;
      p.body.position.set(Math.cos(p.angle) * p.orbit, 0, Math.sin(p.angle) * p.orbit * 0.92);
      p.ball.rotation.y += dt * 0.6;
      p.moon.position.set(Math.cos(t * 1.4 + p.phase) * p.r * 1.9, Math.sin(t * 0.9) * p.r * 0.4, Math.sin(t * 1.4 + p.phase) * p.r * 1.9);
      p.scale += ((p.hover ? 1.45 : 1) - p.scale) * 0.12;
      p.body.scale.setScalar(p.scale);

      // Pin the HTML label under the planet.
      p.body.getWorldPosition(tmp);
      const depth = tmp.z;
      tmp.project(camera);
      const lx = (tmp.x * 0.5 + 0.5) * r.width, ly = (-tmp.y * 0.5 + 0.5) * r.height + 26 + p.r * 40 * p.scale;
      p.label.style.transform = `translate(-50%, 0) translate3d(${lx}px, ${ly}px, 0)`;
      p.label.style.opacity = depth < -2.5 ? "0.35" : "1";
      p.label.style.zIndex = String(Math.round(100 + depth * 10));
    }

    camera.position.x += (mx * 1.4 - camera.position.x) * 0.04;
    camera.position.y += (-my * 1 - camera.position.y) * 0.04;
    camera.position.z = 13 + sp * 4;
    camera.lookAt(0, 0, 0);
    for (const s of starLayers) { s.pts.position.x = -mx * s.depth * 2; s.pts.position.y = my * s.depth * 2; s.pts.rotation.z = t * 0.003 * s.depth; }
    renderer.render(scene, camera);
  };

  if (reduceMotion) { frame(); return; }
  renderer.setAnimationLoop(() => { if (visible) frame(); });
}
