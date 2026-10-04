import { useEffect } from "react";
import { View, useWindowDimensions } from "react-native";
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";
import Animated, {
  Easing, FadeIn, interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { SERVICES } from "@triverse/shared";
import { useTilt } from "./useTilt";

const ACircle = Animated.createAnimatedComponent(Circle);

const INK = "#060A18";
const C = { farm: SERVICES.farm.primary, ride: SERVICES.ride.primary, dine: SERVICES.dine.primary };

/** 0→1 once, after `delay` ms. */
function useOnce(duration: number, delay = 0, easing = Easing.out(Easing.cubic)) {
  const v = useSharedValue(0);
  useEffect(() => { v.set(withDelay(delay, withTiming(1, { duration, easing }))); }, [v, duration, delay, easing]);
  return v;
}
function useLoop(duration: number, { delay = 0, bounce = false, easing = Easing.linear } = {}) {
  const v = useSharedValue(0);
  useEffect(() => { v.set(withDelay(delay, withRepeat(withTiming(1, { duration, easing }), -1, bounce))); }, [v, duration, delay, bounce, easing]);
  return v;
}

/* ───────────────────────── Aurora backdrop ───────────────────────── */

/** Near-black ink with three soft colour glows drifting slowly; layers parallax with phone tilt. */
export function WelcomeBackdrop() {
  const { width: W, height: H } = useWindowDimensions();
  const tilt = useTilt();
  const drift = useLoop(14000, { bounce: true, easing: Easing.inOut(Easing.sin) });
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: INK }}>
      <Svg width={W} height={H}>
        <Defs>
          {(["farm", "ride", "dine"] as const).map((k) => (
            <RadialGradient key={k} id={`glow-${k}`} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor={C[k]} stopOpacity={0.55} />
              <Stop offset="0.45" stopColor={C[k]} stopOpacity={0.18} />
              <Stop offset="1" stopColor={C[k]} stopOpacity={0} />
            </RadialGradient>
          ))}
        </Defs>
        <Glow id="glow-farm" r={W * 0.75} x={[W * 0.05, W * 0.25]} y={[H * 0.12, H * 0.2]} drift={drift} tilt={tilt} depth={24} />
        <Glow id="glow-ride" r={W * 0.85} x={[W * 1.0, W * 0.8]} y={[H * 0.38, H * 0.3]} drift={drift} tilt={tilt} depth={14} />
        <Glow id="glow-dine" r={W * 0.7} x={[W * 0.15, W * 0.35]} y={[H * 0.95, H * 0.82]} drift={drift} tilt={tilt} depth={30} />
      </Svg>
      {/* Fine grain of stars for depth */}
      {Array.from({ length: 26 }, (_, i) => <Star key={i} x={(i * 137) % W} y={(i * 211) % H} delay={i * 170} tilt={tilt} />)}
    </View>
  );
}

function Glow({ id, r, x, y, drift, tilt, depth }: { id: string; r: number; x: [number, number]; y: [number, number]; drift: SharedValue<number>; tilt: { x: SharedValue<number>; y: SharedValue<number> }; depth: number }) {
  const props = useAnimatedProps(() => ({
    cx: interpolate(drift.get(), [0, 1], x) + tilt.x.get() * depth,
    cy: interpolate(drift.get(), [0, 1], y) + tilt.y.get() * depth,
  }));
  return <ACircle r={r} fill={`url(#${id})`} animatedProps={props} />;
}

function Star({ x, y, delay, tilt }: { x: number; y: number; delay: number; tilt: { x: SharedValue<number>; y: SharedValue<number> } }) {
  const t = useLoop(2200 + (delay % 1300), { delay, bounce: true, easing: Easing.inOut(Easing.quad) });
  const s = useAnimatedStyle(() => ({
    opacity: interpolate(t.get(), [0, 1], [0.08, 0.7]),
    transform: [{ translateX: tilt.x.get() * 36 }, { translateY: tilt.y.get() * 24 }],
  }));
  return <Animated.View style={[{ position: "absolute", left: x, top: y, width: 2, height: 2, borderRadius: 1, backgroundColor: "#fff" }, s]} />;
}

/* ───────────────────── Dot globe with landing pin ───────────────────── */

const GLOBE_DOTS = (() => {
  // Fibonacci sphere: evenly spread points; colour by latitude band (Farm top, Ride middle, Dine bottom).
  const n = 170, pts: { lat: number; lon: number; color: string }[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - (i / (n - 1)) * 2;
    const lat = Math.asin(y);
    const lon = (i * golden) % (Math.PI * 2);
    const color = y > 0.33 ? C.farm : y > -0.33 ? C.ride : C.dine;
    pts.push({ lat, lon, color });
  }
  return pts;
})();
const TILT = (-22 * Math.PI) / 180; // planet-like axial tilt

function GlobeDot({ lat, lon, color, spin, r, cx, cy, appear }: { lat: number; lon: number; color: string; spin: SharedValue<number>; r: number; cx: number; cy: number; appear: SharedValue<number> }) {
  const s = useAnimatedStyle(() => {
    const a = lon + spin.get() * Math.PI * 2;
    const x = Math.cos(lat) * Math.sin(a);
    const y0 = Math.sin(lat);
    const z0 = Math.cos(lat) * Math.cos(a);
    // Rotate around the X axis for the tilt.
    const y = y0 * Math.cos(TILT) - z0 * Math.sin(TILT);
    const z = y0 * Math.sin(TILT) + z0 * Math.cos(TILT);
    const front = (z + 1) / 2; // 0 back … 1 front
    return {
      opacity: appear.get() * (0.15 + front * 0.85),
      transform: [{ translateX: cx + x * r * appear.get() }, { translateY: cy - y * r * appear.get() }, { scale: 0.45 + front * 0.9 }],
    };
  });
  return <Animated.View style={[{ position: "absolute", left: -3, top: -3, width: 6, height: 6, borderRadius: 3, backgroundColor: color }, s]} />;
}

/** Orbit ring (a tilted ellipse) with a spark travelling around it, in front of and behind the globe. */
const ORBIT_TILT = (-12 * Math.PI) / 180;
function Orbit({ cx, cy, rx, ry, spark, size }: { cx: number; cy: number; rx: number; ry: number; spark: SharedValue<number>; size: number }) {
  const s = useAnimatedStyle(() => {
    const a = spark.get() * Math.PI * 2;
    const ex = Math.cos(a) * rx, ey = Math.sin(a) * ry;
    // Rotate the point by the ring's tilt so the spark stays on the drawn ellipse.
    const x = ex * Math.cos(ORBIT_TILT) - ey * Math.sin(ORBIT_TILT);
    const y = ex * Math.sin(ORBIT_TILT) + ey * Math.cos(ORBIT_TILT);
    const front = Math.sin(a) > 0;
    return { zIndex: front ? 50 : 0, opacity: front ? 1 : 0.35, transform: [{ translateX: cx + x - 5 }, { translateY: cy + y - 5 }, { scale: front ? 1.2 : 0.7 }] };
  });
  return (
    <>
      <Svg width={size} height={size} style={{ position: "absolute", left: 0, top: 0 }}>
        <Ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke="rgba(157,184,255,0.4)" strokeWidth={1.2} transform={`rotate(${(ORBIT_TILT * 180) / Math.PI} ${cx} ${cy})`} />
      </Svg>
      <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFFFFF", shadowColor: "#9DB8FF", shadowOpacity: 1, shadowRadius: 8 }, s]} />
    </>
  );
}

export function GlobeMark({ size = 260 }: { size?: number }) {
  const r = size * 0.31, cx = size / 2, cy = size * 0.6;
  const appear = useOnce(1200, 100, Easing.out(Easing.back(1.4)));
  const spin = useLoop(16000, { delay: 0 });
  const spark = useLoop(5000, { delay: 1400 });
  const drop = useOnce(900, 1100, Easing.bounce);
  const ripple = useLoop(2200, { delay: 1900, easing: Easing.out(Easing.quad) });
  const float = useLoop(3200, { delay: 2100, bounce: true, easing: Easing.inOut(Easing.sin) });

  const pin = useAnimatedStyle(() => ({
    opacity: interpolate(drop.get(), [0, 0.15], [0, 1], "clamp"),
    transform: [{ translateY: interpolate(drop.get(), [0, 1], [-size * 0.6, 0]) + interpolate(float.get(), [0, 1], [0, -5]) }],
  }));
  const rippleStyle = useAnimatedStyle(() => ({
    opacity: drop.get() >= 1 ? interpolate(ripple.get(), [0, 1], [0.7, 0]) : 0,
    transform: [{ scaleX: interpolate(ripple.get(), [0, 1], [0.3, 1.6]) }, { scaleY: interpolate(ripple.get(), [0, 1], [0.12, 0.5]) }],
  }));

  const pinW = size * 0.22, pinH = pinW * 1.25;
  return (
    <View style={{ width: size, height: size }}>
      {/* soft halo */}
      <View style={{ position: "absolute", left: cx - r * 1.35, top: cy - r * 1.35, width: r * 2.7, height: r * 2.7, borderRadius: r * 1.35, backgroundColor: "rgba(47,111,235,0.12)" }} />
      <Orbit cx={cx} cy={cy} rx={r * 1.45} ry={r * 0.42} spark={spark} size={size} />
      {GLOBE_DOTS.map((d, i) => <GlobeDot key={i} {...d} spin={spin} r={r} cx={cx} cy={cy} appear={appear} />)}
      {/* landing ripple on the north pole */}
      <Animated.View style={[{ position: "absolute", left: cx - 40, top: cy - r - 40, width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: "#9DB8FF" }, rippleStyle]} />
      <Animated.View style={[{ position: "absolute", left: cx - pinW / 2, top: cy - r - pinH + 6, zIndex: 60 }, pin]}>
        <Svg width={pinW} height={pinH} viewBox="14 19 112 140">
          <Path d="M70 145 C50 115 28 100 28 75 A42 42 0 1 1 112 75 C112 100 90 115 70 145 Z" fill="#FFFFFF" />
          <Circle cx={70} cy={75} r={30} fill={INK} />
          <Circle cx={70} cy={62} r={9} fill={C.farm} />
          <Circle cx={58} cy={84} r={9} fill={C.ride} />
          <Circle cx={82} cy={84} r={9} fill={C.dine} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/* ─────────────────────────── Wordmark ─────────────────────────── */

/** Letters flip up in 3D one by one; the tagline cycles Grow. → Go. → Dine. in each world's colour. */
export function AnimatedWordmark({ size = 46 }: { size?: number }) {
  return (
    <View style={{ alignItems: "center", gap: 10 }}>
      <View style={{ flexDirection: "row" }}>
        {"TriVerse".split("").map((ch, i) => <FlipLetter key={i} ch={ch} i={i} size={size} />)}
      </View>
      <TaglineCycle />
    </View>
  );
}

function FlipLetter({ ch, i, size }: { ch: string; i: number; size: number }) {
  const t = useOnce(650, 1500 + i * 70, Easing.out(Easing.back(1.8)));
  const s = useAnimatedStyle(() => ({ opacity: t.get(), transform: [{ perspective: 400 }, { rotateX: `${interpolate(t.get(), [0, 1], [90, 0])}deg` }, { translateY: interpolate(t.get(), [0, 1], [10, 0]) }] }));
  return <Animated.Text style={[{ fontSize: size, fontWeight: "900", letterSpacing: -1, color: i < 3 ? "#FFFFFF" : "#9DB8FF" }, s]}>{ch}</Animated.Text>;
}

const WORDS: [string, string][] = [["Grow.", C.farm], ["Go.", C.ride], ["Dine.", C.dine]];
function TaglineCycle() {
  const t = useLoop(WORDS.length * 1600, { delay: 2300 });
  return (
    <Animated.View entering={FadeIn.delay(2300)} style={{ height: 30, width: 220, overflow: "hidden", flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 }}>
      <Animated.Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 17, fontWeight: "600" }}>One app to</Animated.Text>
      <View style={{ width: 70, height: 30 }}>
        {WORDS.map(([w, c], i) => <CycleWord key={w} word={w} color={c} i={i} t={t} />)}
      </View>
    </Animated.View>
  );
}
function CycleWord({ word, color, i, t }: { word: string; color: string; i: number; t: SharedValue<number> }) {
  const s = useAnimatedStyle(() => {
    const n = WORDS.length;
    const local = ((t.get() * n - i) % n + n) % n; // 0..n; this word is "on" for local in [0,1)
    const y = local < 1 ? interpolate(local, [0, 0.15, 0.85, 1], [24, 0, 0, -24]) : 24;
    const o = local < 1 ? interpolate(local, [0, 0.15, 0.85, 1], [0, 1, 1, 0]) : 0;
    return { opacity: o, transform: [{ translateY: y }] };
  });
  return <Animated.Text style={[{ position: "absolute", left: 0, top: 2, color, fontSize: 19, fontWeight: "900" }, s]}>{word}</Animated.Text>;
}
