// TriVerse website: WebGL globe, world-aware cursors, 3D tilt/parallax and scroll reveals.
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

const WORLDS = {
  brand: 0x5b8ef5, farm: 0x22a35a, ride: 0x2f6feb, dine: 0xf2643d, health: 0x0d9488, travel: 0x7c3aed,
};

/* ---------- Split the hero title into letters for the 3D entrance ---------- */
document.querySelectorAll(".split").forEach((el) => {
  let i = 0;
  el.innerHTML = el.innerHTML.split(/(<br\s*\/?>)/).map((part) =>
    part.startsWith("<br") ? part : [...part].map((c) => c === " " ? " " : `<span class="ch" style="--i:${i++}">${c}</span>`).join(""),
  ).join("");
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

/* ---------- Current world: drives colours and the cursor ---------- */
let currentWorld = "brand";
const onWorld = new Set();
const worldWatcher = new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (e.isIntersecting) {
      currentWorld = e.target.dataset.world || "brand";
      document.body.dataset.world = currentWorld;
      onWorld.forEach((fn) => fn(currentWorld));
    }
  }
}, { rootMargin: "-45% 0px -45% 0px" });
document.querySelectorAll("main > section[data-world], footer[data-world]").forEach((s) => worldWatcher.observe(s));

/* ---------- Cursor follower ring (the arrow itself is the per-world CSS cursor) ---------- */
if (finePointer && !reduceMotion) {
  const ring = document.querySelector(".cursor-ring");
  let x = innerWidth / 2, y = innerHeight / 2, rx = x, ry = y;
  addEventListener("pointermove", (e) => { x = e.clientX; y = e.clientY; ring.classList.add("on"); }, { passive: true });
  document.addEventListener("pointerleave", () => ring.classList.remove("on"));
  addEventListener("pointerover", (e) => ring.classList.toggle("hover", !!e.target.closest("a, button, .card, .world-chips li")));
  (function follow() {
    rx += (x - rx) * 0.18; ry += (y - ry) * 0.18;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(follow);
  })();
}

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

/* ---------- WebGL globe ---------- */
startGlobe().catch(() => { /* no WebGL: the CSS glow behind the hero still looks fine */ });

async function startGlobe() {
  const canvas = document.getElementById("globe");
  const THREE = await import("three");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, 7.2);

  const world = new THREE.Group();
  scene.add(world);
  const R = 2;

  // Globe made of dots (Fibonacci sphere) with a soft rim.
  const N = innerWidth < 700 ? 1400 : 2600;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = Math.PI * (3 - Math.sqrt(5)) * i;
    pos.set([Math.cos(th) * r * R, y * R, Math.sin(th) * r * R], i * 3);
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const dotMat = new THREE.PointsMaterial({ size: 0.05, color: WORLDS.brand, transparent: true, opacity: 0.95, depthWrite: false });
  world.add(new THREE.Points(dotGeo, dotMat));
  world.add(new THREE.Mesh(new THREE.SphereGeometry(R * 0.985, 48, 48), new THREE.MeshBasicMaterial({ color: 0x070d24 })));

  const rim = new THREE.Mesh(new THREE.SphereGeometry(R * 1.12, 48, 48), new THREE.ShaderMaterial({
    transparent: true, side: THREE.BackSide, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uColor: { value: new THREE.Color(WORLDS.brand) } },
    vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 uColor; varying vec3 vN; void main(){ float i = pow(max(0.62 - dot(vN, vec3(0.0,0.0,1.0)), 0.0), 2.4) * 0.9; gl_FragColor = vec4(uColor, 1.0) * i; }",
  }));
  scene.add(rim);

  // The five worlds as glowing pins around India, linked by animated arcs.
  const toVec = (lat, lng, r = R) => {
    const phi = (90 - lat) * Math.PI / 180, th = (lng + 180) * Math.PI / 180;
    return new THREE.Vector3(-r * Math.sin(phi) * Math.cos(th), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(th));
  };
  const PINS = [
    { w: "farm", lat: 30.9, lng: 72.5 }, { w: "ride", lat: 23.5, lng: 87.5 }, { w: "dine", lat: 12.9, lng: 79.5 },
    { w: "health", lat: 19.1, lng: 72.9 }, { w: "travel", lat: 34.5, lng: 78.5 },
    { w: "ride", lat: 1.35, lng: 103.8 }, { w: "dine", lat: 25.2, lng: 55.3 }, { w: "travel", lat: 27.7, lng: 85.3 },
    { w: "farm", lat: 6.9, lng: 79.9 }, { w: "health", lat: 13.75, lng: 100.5 },
  ];
  const pins = PINS.map((p) => {
    const g = new THREE.Group();
    const v = toVec(p.lat, p.lng);
    g.position.copy(v);
    g.lookAt(v.clone().multiplyScalar(2));
    const col = new THREE.Color(WORLDS[p.w]);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 16), new THREE.MeshBasicMaterial({ color: col }));
    head.position.z = 0.16;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), new THREE.MeshBasicMaterial({ color: col }));
    stem.rotation.x = Math.PI / 2; stem.position.z = 0.08;
    const pulse = new THREE.Mesh(new THREE.RingGeometry(0.04, 0.052, 32), new THREE.MeshBasicMaterial({ color: col, transparent: true, side: THREE.DoubleSide }));
    g.add(head, stem, pulse);
    world.add(g);
    return { g, pulse, phase: Math.random() * Math.PI * 2, world: p.w };
  });

  const arcs = [];
  for (let i = 0; i < PINS.length; i++) {
    const a = PINS[i], b = PINS[(i + 3) % PINS.length];
    const va = toVec(a.lat, a.lng), vb = toVec(b.lat, b.lng);
    const mid = va.clone().add(vb).multiplyScalar(0.5).normalize().multiplyScalar(R + 0.35 + va.distanceTo(vb) * 0.35);
    const curve = new THREE.QuadraticBezierCurve3(va, mid, vb);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(64)),
      new THREE.LineBasicMaterial({ color: WORLDS[a.w], transparent: true, opacity: 0.35 }));
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 10), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    world.add(line, spark);
    arcs.push({ curve, spark, t: Math.random(), speed: 0.12 + Math.random() * 0.1 });
  }

  // Three depth layers of stars for parallax.
  const starLayers = [0.6, 1, 1.6].map((depth, li) => {
    const n = 500, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) p.set([(Math.random() - 0.5) * 40, (Math.random() - 0.5) * 24, -6 - Math.random() * 14 + li * 3], i * 3);
    const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.02 * (li + 1), color: 0xdbe4ff, transparent: true, opacity: 0.4 + li * 0.2, depthWrite: false }));
    scene.add(pts);
    return { pts, depth };
  });

  // India faces the viewer at start.
  world.rotation.y = Math.PI - 0.15; world.rotation.x = 0.35;
  const layout = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    const shift = w > 960 ? 1.9 : 0; // globe sits to the right of the copy on wide screens
    world.position.set(shift, w > 960 ? 0 : 1.75, 0); rim.position.copy(world.position);
    world.scale.setScalar(w > 960 ? 0.82 : 0.6); rim.scale.copy(world.scale);
  };
  layout(); addEventListener("resize", layout);

  // Colour follows the current world.
  const target = new THREE.Color(WORLDS.brand);
  onWorld.add((w) => target.set(WORLDS[w] ?? WORLDS.brand));

  let mx = 0, my = 0, visible = true, scrollY0 = 0;
  addEventListener("pointermove", (e) => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5; }, { passive: true });
  addEventListener("scroll", () => { scrollY0 = scrollY; }, { passive: true });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(canvas);

  const clock = new THREE.Clock();
  const frame = () => {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (!reduceMotion) world.rotation.y += dt * 0.08;
    const sp = Math.min(scrollY0 / innerHeight, 1);
    world.rotation.x = 0.35 + sp * 0.6;
    camera.position.x += (mx * 0.8 - camera.position.x) * 0.05;
    camera.position.y += (-my * 0.6 - camera.position.y) * 0.05;
    camera.position.z = 7.2 + sp * 2.5;
    camera.lookAt(0, 0, 0);
    dotMat.color.lerp(target, 0.04);
    rim.material.uniforms.uColor.value.lerp(target, 0.04);
    for (const s of starLayers) { s.pts.position.x = -mx * s.depth; s.pts.position.y = my * s.depth; s.pts.rotation.z = t * 0.004 * s.depth; }
    for (const p of pins) {
      const k = ((t * 0.8 + p.phase) % 2) / 2;
      p.pulse.scale.setScalar(1 + k * 2.2); p.pulse.material.opacity = 1 - k;
    }
    for (const a of arcs) { a.t = (a.t + dt * a.speed) % 1; a.spark.position.copy(a.curve.getPoint(a.t)); }
    renderer.render(scene, camera);
  };

  if (reduceMotion) { frame(); return; }
  renderer.setAnimationLoop(() => { if (visible) frame(); });
}
