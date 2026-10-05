import { useEffect, useState, type ReactNode } from "react";
import { Image as ExpoImage } from "expo-image";
import { SERVICES } from "@triverse/shared";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useMotion } from "@/lib/theme";
import { Text, View, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";
import Animated, {
  Easing, FadeIn, interpolate, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming, type SharedValue,
} from "react-native-reanimated";

const APath = Animated.createAnimatedComponent(Path);
import type { ServiceId } from "@triverse/shared";
import { ParallaxHeader } from "./scroll";

/** Every drawn banner shares one deep brand-navy backdrop, so worlds feel like one app; the world shows in the details. */
const SCENE_BG: [string, string, string] = ["#0B1530", "#16306E", "#2B4FB3"];
import { useTilt } from "./useTilt";

const H = 210;
type Tilt = ReturnType<typeof useTilt>;

function useLoop(duration: number, { delay = 0, bounce = false, easing = Easing.linear } = {}) {
  const v = useSharedValue(0);
  useEffect(() => { v.set(withDelay(delay, withRepeat(withTiming(1, { duration, easing }), -1, bounce))); }, [v, duration, delay, bounce, easing]);
  return v;
}

/** A layer that shifts with device tilt; bigger depth = closer = moves more (parallax). */
function Layer({ depth, tilt, children }: { depth: number; tilt: Tilt; children: ReactNode }) {
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: tilt.x.get() * depth }, { translateY: tilt.y.get() * depth * 0.6 }] }));
  return <Animated.View pointerEvents="none" style={[{ position: "absolute", left: -30, right: -30, top: -20, bottom: -20 }, s]}>{children}</Animated.View>;
}

function Scene({ colors, children, title, subtitle, dark = true }: { colors: [string, string, ...string[]]; children: (tilt: Tilt, w: number) => ReactNode; title: string; subtitle: string; dark?: boolean }) {
  const { width } = useWindowDimensions();
  const tilt = useTilt();
  const card = useAnimatedStyle(() => ({ transform: [{ perspective: 900 }, { rotateY: `${tilt.x.get() * 6}deg` }, { rotateX: `${-tilt.y.get() * 5}deg` }] }));
  return (
    <Animated.View entering={FadeIn.duration(500)} style={[{ height: H, borderRadius: 26, overflow: "hidden" }, card]}>
      <LinearGradient colors={colors} start={{ x: 0, y: 0 }} end={{ x: 0.2, y: 1 }} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }} />
      {children(tilt, width - 32)}
      <LinearGradient pointerEvents="none" colors={["transparent", "rgba(0,0,0,0.45)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 90 }} />
      <View style={{ position: "absolute", left: 20, bottom: 18, right: 20 }}>
        <Text style={{ color: "#FFFFFF", fontSize: 26, fontWeight: "900", letterSpacing: -0.5, textShadowColor: "rgba(0,0,0,0.35)", textShadowRadius: 8 }}>{title}</Text>
        <Text numberOfLines={2} style={{ color: dark ? "rgba(255,255,255,0.9)" : "#fff", fontSize: 14, fontWeight: "600" }}>{subtitle}</Text>
      </View>
    </Animated.View>
  );
}

/* ═══════════════ Farm: terraced hills, sun rays, a seedling that grows ═══════════════ */

function SunRays({ x, y }: { x: number; y: number }) {
  const spin = useLoop(24000);
  const s = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360}deg` }] }));
  return (
    <View style={{ position: "absolute", left: x - 70, top: y - 70, width: 140, height: 140, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", width: 140, height: 140 }, s]}>
        {Array.from({ length: 12 }, (_, i) => (
          <View key={i} style={{ position: "absolute", left: 68, top: 0, width: 4, height: 70, borderRadius: 2, backgroundColor: "rgba(255,240,170,0.45)", transform: [{ translateY: 35 }, { rotate: `${i * 30}deg` }, { translateY: -35 }] }} />
        ))}
      </Animated.View>
      <View style={{ width: 54, height: 54, borderRadius: 27, backgroundColor: "#FDE047", borderWidth: 6, borderColor: "rgba(253,224,71,0.45)" }} />
    </View>
  );
}

function Terrace({ color, top, height, curve, w }: { color: string; top: number; height: number; curve: number; w: number }) {
  return <View style={{ position: "absolute", left: -40, width: w + 160, top, height, backgroundColor: color, borderTopLeftRadius: curve, borderTopRightRadius: curve * 0.7 }} />;
}

/** Seedling life-cycle loop: stem rises, leaves unfold, flower blooms, then it starts again. */
function Seedling({ x }: { x: number }) {
  const t = useLoop(6000);
  const stem = useAnimatedStyle(() => ({ transform: [{ translateY: 28 }, { scaleY: interpolate(t.get(), [0, 0.3, 0.9, 1], [0.05, 1, 1, 0.05], "clamp") }, { translateY: -28 }] }));
  const leafL = useAnimatedStyle(() => ({ opacity: interpolate(t.get(), [0.25, 0.4, 0.9, 1], [0, 1, 1, 0], "clamp"), transform: [{ rotate: `${interpolate(t.get(), [0.25, 0.45], [0, -55], "clamp")}deg` }, { scale: interpolate(t.get(), [0.25, 0.45], [0.2, 1], "clamp") }] }));
  const leafR = useAnimatedStyle(() => ({ opacity: interpolate(t.get(), [0.35, 0.5, 0.9, 1], [0, 1, 1, 0], "clamp"), transform: [{ rotate: `${interpolate(t.get(), [0.35, 0.55], [0, 55], "clamp")}deg` }, { scale: interpolate(t.get(), [0.35, 0.55], [0.2, 1], "clamp") }] }));
  const bloom = useAnimatedStyle(() => ({ opacity: interpolate(t.get(), [0.55, 0.65, 0.9, 1], [0, 1, 1, 0], "clamp"), transform: [{ scale: interpolate(t.get(), [0.55, 0.7], [0, 1.15], "clamp") }] }));
  return (
    <View style={{ position: "absolute", left: x, bottom: 62, width: 60, height: 90, alignItems: "center" }}>
      <Animated.Text style={[{ position: "absolute", top: 0, fontSize: 26 }, bloom]}>🌼</Animated.Text>
      <Animated.View style={[{ position: "absolute", bottom: 0, width: 5, height: 56, borderRadius: 3, backgroundColor: "#15803D" }, stem]} />
      <Animated.View style={[{ position: "absolute", bottom: 26, left: 30, width: 22, height: 10, borderRadius: 10, backgroundColor: "#22C55E", transformOrigin: "left center" }, leafR]} />
      <Animated.View style={[{ position: "absolute", bottom: 32, right: 30, width: 22, height: 10, borderRadius: 10, backgroundColor: "#16A34A", transformOrigin: "right center" }, leafL]} />
      <View style={{ position: "absolute", bottom: -4, width: 46, height: 12, borderRadius: 12, backgroundColor: "#7C4A1E" }} />
    </View>
  );
}

function RainDrop({ x, delay }: { x: number; delay: number }) {
  const t = useLoop(9000, { delay });
  const s = useAnimatedStyle(() => {
    // Rain only falls in the first part of every 9 s cycle: short showers between sunny spells.
    const p = t.get() * 6;
    const local = p - Math.floor(p);
    const on = t.get() < 0.33 ? 1 : 0;
    return { opacity: on * interpolate(local, [0, 0.1, 0.9, 1], [0, 0.8, 0.8, 0]), transform: [{ translateY: local * H }, { translateX: -local * 30 }, { rotate: "15deg" }] };
  });
  return <Animated.View style={[{ position: "absolute", left: x, top: -10, width: 2, height: 16, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.85)" }, s]} />;
}

function FarmHero({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <Scene colors={SCENE_BG} title={title} subtitle={subtitle}>
      {(tilt, w) => (
        <>
          <Layer depth={5} tilt={tilt}><SunRays x={w - 40} y={70} /></Layer>
          <Layer depth={8} tilt={tilt}>
            <Terrace color="#4ADE80" top={92} height={150} curve={260} w={w} />
            <Terrace color="#22C55E" top={118} height={130} curve={300} w={w} />
          </Layer>
          <Layer depth={14} tilt={tilt}>
            <Terrace color="#16A34A" top={142} height={110} curve={340} w={w} />
            {/* terrace step lines */}
            {[150, 172].map((y) => <View key={y} style={{ position: "absolute", left: 0, width: w + 100, top: y, height: 2, backgroundColor: "rgba(255,255,255,0.18)" }} />)}
          </Layer>
          <Layer depth={22} tilt={tilt}>
            <Seedling x={w * 0.55} />
            <Text style={{ position: "absolute", left: w * 0.32, bottom: 66, fontSize: 22 }}>🌱</Text>
            <Text style={{ position: "absolute", left: w * 0.78, bottom: 70, fontSize: 20 }}>🌿</Text>
          </Layer>
          <Layer depth={28} tilt={tilt}>{Array.from({ length: 10 }, (_, i) => <RainDrop key={i} x={(i * 83) % (w + 60)} delay={i * 190} />)}</Layer>
        </>
      )}
    </Scene>
  );
}

/* ═══════════════ Ride: 3D highway at dusk ═══════════════ */

const HORIZON = 92;

/** A road marking that starts tiny at the horizon and rushes toward the viewer, growing. */
function Dash({ phase, cx }: { phase: number; cx: number }) {
  const t = useLoop(1400, { delay: phase * 1400 });
  const s = useAnimatedStyle(() => {
    const p = t.get() * t.get(); // ease-in: things accelerate as they come closer
    return {
      opacity: interpolate(t.get(), [0, 0.15, 1], [0, 1, 1]),
      transform: [{ translateY: HORIZON + p * (H - HORIZON + 30) }, { scaleY: 0.2 + p * 2.2 }, { scaleX: 0.15 + p * 1.6 }],
    };
  });
  return <Animated.View style={[{ position: "absolute", left: cx - 3, top: 0, width: 6, height: 16, borderRadius: 2, backgroundColor: "#FDE68A" }, s]} />;
}

/** A streetlight passing on one side, drifting outward as it approaches. */
function Lamp({ phase, cx, side }: { phase: number; cx: number; side: 1 | -1 }) {
  const t = useLoop(2000, { delay: phase * 2000 });
  const s = useAnimatedStyle(() => {
    const p = t.get() * t.get();
    return {
      opacity: interpolate(t.get(), [0, 0.2, 0.95, 1], [0, 1, 1, 0]),
      transform: [{ translateX: cx + side * (14 + p * 210) }, { translateY: HORIZON - 4 + p * 70 }, { scale: 0.2 + p * 1.6 }],
    };
  });
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, alignItems: "center" }, s]}>
      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: "#FEF08A", shadowColor: "#FDE047", shadowOpacity: 1, shadowRadius: 10 }} />
      <View style={{ width: 2, height: 34, backgroundColor: "rgba(15,23,42,0.75)" }} />
    </Animated.View>
  );
}

function RideHero({ title, subtitle }: { title: string; subtitle: string }) {
  const sway = useLoop(2600, { bounce: true, easing: Easing.inOut(Easing.sin) });
  const car = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(sway.get(), [0, 1], [-10, 10]) }, { rotate: `${interpolate(sway.get(), [0, 1], [-2, 2])}deg` }] }));
  return (
    <Scene colors={SCENE_BG} title={title} subtitle={subtitle}>
      {(tilt, w) => {
        const cx = w / 2;
        return (
          <>
            <Layer depth={4} tilt={tilt}>
              <View style={{ position: "absolute", left: cx - 40, top: 44, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(253,186,116,0.9)" }} />
            </Layer>
            <Layer depth={8} tilt={tilt}>
              {/* Mountains on the horizon */}
              <View style={{ position: "absolute", left: -20, top: HORIZON - 46, width: 0, height: 0, borderLeftWidth: 90, borderRightWidth: 90, borderBottomWidth: 56, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#1E1B4B" }} />
              <View style={{ position: "absolute", left: w * 0.45, top: HORIZON - 60, width: 0, height: 0, borderLeftWidth: 120, borderRightWidth: 120, borderBottomWidth: 70, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#2E1065" }} />
              <View style={{ position: "absolute", left: 0, right: 0, top: HORIZON + 10, height: H, backgroundColor: "#1E1B4B" }} />
            </Layer>
            <Layer depth={0} tilt={tilt}>
              {/* Road in perspective: a trapezoid from the horizon to the bottom */}
              <View style={{ position: "absolute", left: cx - 300 + 30, top: HORIZON + 10, width: 0, height: 0, borderLeftWidth: 300, borderRightWidth: 300, borderBottomWidth: H - HORIZON + 30, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#334155" }} />
              {[0, 0.25, 0.5, 0.75].map((ph) => <Dash key={ph} phase={ph} cx={cx + 30} />)}
              {[0, 0.5].map((ph) => <Lamp key={`l${ph}`} phase={ph} cx={cx + 30} side={-1} />)}
              {[0.25, 0.75].map((ph) => <Lamp key={`r${ph}`} phase={ph} cx={cx + 30} side={1} />)}
            </Layer>
            <Animated.View style={[{ position: "absolute", left: cx - 32, bottom: 54, width: 64, alignItems: "center" }, car]}>
              {/* Car seen from behind: body, window, glowing tail lights */}
              <View style={{ width: 64, height: 30, borderRadius: 10, backgroundColor: "#0F172A", borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
                <View style={{ position: "absolute", left: 12, right: 12, top: 4, height: 9, borderRadius: 4, backgroundColor: "#60A5FA" }} />
                <View style={{ position: "absolute", left: 4, bottom: 6, width: 12, height: 5, borderRadius: 2, backgroundColor: "#EF4444", shadowColor: "#EF4444", shadowOpacity: 1, shadowRadius: 8 }} />
                <View style={{ position: "absolute", right: 4, bottom: 6, width: 12, height: 5, borderRadius: 2, backgroundColor: "#EF4444", shadowColor: "#EF4444", shadowOpacity: 1, shadowRadius: 8 }} />
              </View>
              <View style={{ flexDirection: "row", gap: 32, marginTop: -2 }}>
                <View style={{ width: 12, height: 6, borderRadius: 2, backgroundColor: "#020617" }} />
                <View style={{ width: 12, height: 6, borderRadius: 2, backgroundColor: "#020617" }} />
              </View>
            </Animated.View>
          </>
        );
      }}
    </Scene>
  );
}

/* ═══════════════ Dine: spinning food turntable under fairy lights ═══════════════ */

const DISHES = ["🍛", "🍕", "🥟", "🍜", "☕", "🍰"];

function Dish({ i, spin, cx, cy, rx, ry }: { i: number; spin: SharedValue<number>; cx: number; cy: number; rx: number; ry: number }) {
  const s = useAnimatedStyle(() => {
    const a = spin.get() * Math.PI * 2 + (i / DISHES.length) * Math.PI * 2;
    const depth = Math.sin(a); // 1 = front
    return {
      zIndex: Math.round((depth + 1) * 10),
      opacity: interpolate(depth, [-1, 1], [0.55, 1]),
      transform: [{ translateX: cx + Math.cos(a) * rx - 22 }, { translateY: cy + depth * ry - 22 }, { scale: interpolate(depth, [-1, 1], [0.6, 1.35]) }],
    };
  });
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center" }, s]}>
      <Text style={{ fontSize: 26 }}>{DISHES[i]}</Text>
    </Animated.View>
  );
}

function Bulb({ x, y, delay, color }: { x: number; y: number; delay: number; color: string }) {
  const t = useLoop(1600, { delay, bounce: true, easing: Easing.inOut(Easing.sin) });
  const s = useAnimatedStyle(() => ({ opacity: interpolate(t.get(), [0, 1], [0.35, 1]), transform: [{ scale: interpolate(t.get(), [0, 1], [0.85, 1.15]) }] }));
  return <Animated.View style={[{ position: "absolute", left: x - 5, top: y - 5, width: 10, height: 10, borderRadius: 5, backgroundColor: color, shadowColor: color, shadowOpacity: 1, shadowRadius: 8 }, s]} />;
}

function DineHero({ title, subtitle }: { title: string; subtitle: string }) {
  const spin = useLoop(12000);
  return (
    <Scene colors={SCENE_BG} title={title} subtitle={subtitle}>
      {(tilt, w) => {
        const cx = w * 0.62, cy = 92;
        // Fairy lights hang along a sagging curve.
        const bulbs = Array.from({ length: 14 }, (_, i) => { const x = (i / 13) * (w + 40) - 20; const sag = Math.sin((i / 13) * Math.PI) * 26; return { x, y: 14 + sag }; });
        const colors = ["#FDE68A", "#FCA5A5", "#A7F3D0", "#BFDBFE"];
        return (
          <>
            <Layer depth={6} tilt={tilt}>
              {bulbs.map((b, i) => <Bulb key={i} x={b.x} y={b.y} delay={i * 140} color={colors[i % 4]} />)}
            </Layer>
            <Layer depth={14} tilt={tilt}>
              {/* Turntable */}
              <View style={{ position: "absolute", left: cx - 120, top: cy - 26, width: 240, height: 80, borderRadius: 120, backgroundColor: "rgba(0,0,0,0.22)", transform: [{ scaleY: 0.6 }] }} />
              <View style={{ position: "absolute", left: cx - 110, top: cy - 22, width: 220, height: 70, borderRadius: 110, borderWidth: 2, borderColor: "rgba(255,255,255,0.35)", transform: [{ scaleY: 0.6 }] }} />
              {DISHES.map((_, i) => <Dish key={i} i={i} spin={spin} cx={cx} cy={cy} rx={100} ry={22} />)}
            </Layer>
          </>
        );
      }}
    </Scene>
  );
}

/* ═══════════════ Health: live heartbeat monitor ═══════════════ */

/** One heartbeat segment repeated across the width: flat, small bump, sharp spike, dip, recovery. */
function ecgPath(w: number, y: number): string {
  let d = `M 0 ${y}`;
  for (let x = 0; x < w + 120; x += 120) {
    d += ` L ${x + 30} ${y} L ${x + 38} ${y - 8} L ${x + 46} ${y} L ${x + 54} ${y} L ${x + 60} ${y + 10} L ${x + 68} ${y - 46} L ${x + 76} ${y + 22} L ${x + 84} ${y} L ${x + 96} ${y - 10} L ${x + 108} ${y} L ${x + 120} ${y}`;
  }
  return d;
}

function Plus({ x, delay }: { x: number; delay: number }) {
  const t = useLoop(5200, { delay });
  const s = useAnimatedStyle(() => ({ opacity: interpolate(t.get(), [0, 0.2, 0.8, 1], [0, 0.55, 0.55, 0]), transform: [{ translateY: interpolate(t.get(), [0, 1], [H, -20]) }, { rotate: `${t.get() * 90}deg` }] }));
  return <Animated.Text style={[{ position: "absolute", left: x, top: 0, fontSize: 18, color: "#CCFBF1", fontWeight: "900" }, s]}>✚</Animated.Text>;
}

function HealthHero({ title, subtitle }: { title: string; subtitle: string }) {
  const sweep = useLoop(2400);
  const beat = useLoop(1200, { easing: Easing.out(Easing.quad) });
  const heart = useAnimatedStyle(() => ({ transform: [{ scale: interpolate(beat.get(), [0, 0.15, 0.3, 0.45, 1], [1, 1.25, 1, 1.15, 1]) }] }));
  return (
    <Scene colors={SCENE_BG} title={title} subtitle={subtitle}>
      {(tilt, w) => {
        const len = (w + 120) * 1.6;
        return (
          <>
            <Layer depth={4} tilt={tilt}>
              {/* monitor grid */}
              {Array.from({ length: 9 }, (_, i) => <View key={`h${i}`} style={{ position: "absolute", left: 0, right: 0, top: i * 26, height: 1, backgroundColor: "rgba(204,251,241,0.08)" }} />)}
              {Array.from({ length: 16 }, (_, i) => <View key={`v${i}`} style={{ position: "absolute", top: 0, bottom: 0, left: i * 28, width: 1, backgroundColor: "rgba(204,251,241,0.08)" }} />)}
            </Layer>
            <Layer depth={10} tilt={tilt}><EcgLine w={w + 60} len={len} sweep={sweep} /></Layer>
            <Layer depth={18} tilt={tilt}>
              <Animated.Text style={[{ position: "absolute", right: 46, top: 34, fontSize: 40 }, heart]}>❤️</Animated.Text>
              <Text style={{ position: "absolute", right: 34, top: 86, color: "#99F6E4", fontWeight: "800", fontSize: 13 }}>72 bpm</Text>
            </Layer>
            <Layer depth={26} tilt={tilt}>{[30, 120, 210, 300].map((x, i) => <Plus key={x} x={x} delay={i * 1200} />)}</Layer>
          </>
        );
      }}
    </Scene>
  );
}

function EcgLine({ w, len, sweep }: { w: number; len: number; sweep: SharedValue<number> }) {
  // A bright pen draws the trace while the line behind it fades: like a hospital monitor.
  const pen = useAnimatedProps(() => ({ strokeDashoffset: len * (1 - sweep.get()) }));
  return (
    <Svg width={w} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
      <Path d={ecgPath(w, 92)} stroke="rgba(94,234,212,0.18)" strokeWidth={2} fill="none" />
      <APath d={ecgPath(w, 92)} stroke="#5EEAD4" strokeWidth={3} fill="none" strokeLinejoin="round" strokeDasharray={`${len * 0.35} ${len}`} animatedProps={pen} />
    </Svg>
  );
}

/* ═══════════════ Travel: paper plane over the peaks ═══════════════ */

const ROUTE = (w: number) => `M -10 150 C ${w * 0.2} 60, ${w * 0.45} 150, ${w * 0.62} 80 S ${w * 0.9} 40, ${w + 20} 70`;

/** Approximates the cubic route so the plane can follow it with a simple formula. */
function routePoint(w: number, t: number) {
  "worklet";
  const pts = [[-10, 150], [w * 0.2, 60], [w * 0.45, 150], [w * 0.62, 80]];
  const pts2 = [[w * 0.62, 80], [w * 0.79, 10], [w * 0.9, 40], [w + 20, 70]];
  const seg = t < 0.55 ? pts : pts2;
  const u = t < 0.55 ? t / 0.55 : (t - 0.55) / 0.45;
  const b = (i: number) => (1 - u) ** 3 * seg[0][i] + 3 * (1 - u) ** 2 * u * seg[1][i] + 3 * (1 - u) * u ** 2 * seg[2][i] + u ** 3 * seg[3][i];
  return { x: b(0), y: b(1) };
}

function Plane({ w, fly }: { w: number; fly: SharedValue<number> }) {
  const s = useAnimatedStyle(() => {
    const p = routePoint(w, fly.get());
    const q = routePoint(w, Math.min(1, fly.get() + 0.01));
    const angle = Math.atan2(q.y - p.y, q.x - p.x);
    return { transform: [{ translateX: p.x - 14 }, { translateY: p.y - 14 }, { rotate: `${angle}rad` }] };
  });
  return <Animated.Text style={[{ position: "absolute", left: 0, top: 0, fontSize: 26 }, s]}>✈️</Animated.Text>;
}

function MapPin({ x, y, at, fly }: { x: number; y: number; at: number; fly: SharedValue<number> }) {
  const s = useAnimatedStyle(() => {
    const p = fly.get() >= at ? Math.min(1, (fly.get() - at) * 12) : 0;
    return { opacity: p, transform: [{ translateY: (1 - p) * -18 }, { scale: 0.6 + p * 0.4 }] };
  });
  return <Animated.Text style={[{ position: "absolute", left: x - 10, top: y - 30, fontSize: 22 }, s]}>📍</Animated.Text>;
}

function TravelHero({ title, subtitle }: { title: string; subtitle: string }) {
  const fly = useLoop(7000, { easing: Easing.inOut(Easing.quad) });
  const spin = useLoop(30000);
  const compass = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get() * 360}deg` }] }));
  return (
    <Scene colors={SCENE_BG} title={title} subtitle={subtitle}>
      {(tilt, w) => (
        <>
          <Layer depth={5} tilt={tilt}>
            <Animated.Text style={[{ position: "absolute", right: 40, top: 24, fontSize: 44, opacity: 0.85 }, compass]}>🧭</Animated.Text>
          </Layer>
          <Layer depth={9} tilt={tilt}>
            {/* snowy peaks */}
            {[[-20, 120, 110], [w * 0.28, 150, 90], [w * 0.62, 130, 100]].map(([x, base, hgt], i) => (
              <View key={i} style={{ position: "absolute", left: x, top: base - hgt + 40 }}>
                <View style={{ width: 0, height: 0, borderLeftWidth: 90, borderRightWidth: 90, borderBottomWidth: hgt, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: i % 2 ? "#4C1D95" : "#5B21B6" }} />
                <View style={{ position: "absolute", left: 66, top: 0, width: 0, height: 0, borderLeftWidth: 24, borderRightWidth: 24, borderBottomWidth: 26, borderLeftColor: "transparent", borderRightColor: "transparent", borderBottomColor: "#EDE9FE" }} />
              </View>
            ))}
          </Layer>
          <Layer depth={16} tilt={tilt}>
            <Svg width={w + 60} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
              <Path d={ROUTE(w)} stroke="rgba(255,255,255,0.75)" strokeWidth={2} strokeDasharray="4 8" fill="none" strokeLinecap="round" />
            </Svg>
            <MapPin x={w * 0.2} y={92} at={0.2} fly={fly} />
            <MapPin x={w * 0.62} y={80} at={0.55} fly={fly} />
            <Plane w={w} fly={fly} />
          </Layer>
        </>
      )}
    </Scene>
  );
}

/* ═══════════════ Realistic photo banners (Farm, Ride, Travel, and any custom banner) ═══════════════ */

interface HeroPhoto { url: string; credit: string; license: string }
const photoCache = new Map<string, HeroPhoto[]>();

function useHeroPhotos(service: ServiceId, custom?: string): HeroPhoto[] | null {
  const [fetched, setFetched] = useState<{ service: ServiceId; photos: HeroPhoto[] } | null>(null);
  useEffect(() => {
    if (custom || photoCache.has(service)) return;
    let live = true;
    api<HeroPhoto[]>(`/media/hero/${service}`)
      .then((p) => { photoCache.set(service, p); if (live) setFetched({ service, photos: p }); })
      .catch(() => { if (live) setFetched({ service, photos: [] }); });
    return () => { live = false; };
  }, [service, custom]);
  if (custom) return [{ url: custom, credit: "Your banner", license: "" }];
  return photoCache.get(service) ?? (fetched?.service === service ? fetched.photos : null);
}

/** Slow "Ken Burns" camera move across a photo: gentle zoom plus pan, alternating direction per slide. */
function KenBurns({ url, index, still }: { url: string; index: number; still: boolean }) {
  const t = useSharedValue(0);
  useEffect(() => { if (!still) { t.set(0); t.set(withTiming(1, { duration: 9000, easing: Easing.inOut(Easing.quad) })); } }, [t, url, still]);
  const dir = index % 2 ? -1 : 1;
  const s = useAnimatedStyle(() => ({
    transform: [{ scale: still ? 1.05 : interpolate(t.get(), [0, 1], [1.06, 1.2]) }, { translateX: still ? 0 : interpolate(t.get(), [0, 1], [-12 * dir, 12 * dir]) }, { translateY: still ? 0 : interpolate(t.get(), [0, 1], [4, -6]) }],
  }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }, s]}>
      <ExpoImage source={{ uri: url }} style={{ flex: 1 }} contentFit="cover" transition={0} cachePolicy="memory-disk" />
    </Animated.View>
  );
}

/* Natural overlays */
function DustMote({ x, delay, w }: { x: number; delay: number; w: number }) {
  const t = useLoop(7000 + (delay % 3000), { delay });
  const s = useAnimatedStyle(() => ({
    opacity: interpolate(t.get(), [0, 0.2, 0.8, 1], [0, 0.8, 0.8, 0]),
    transform: [{ translateY: interpolate(t.get(), [0, 1], [H, H * 0.2]) }, { translateX: Math.sin(t.get() * Math.PI * 2) * 14 + (x % w) }],
  }));
  return <Animated.View style={[{ position: "absolute", left: 0, top: 0, width: 3, height: 3, borderRadius: 2, backgroundColor: "rgba(255,244,214,0.95)" }, s]} />;
}
function SunGlow() {
  const t = useLoop(5000, { bounce: true, easing: Easing.inOut(Easing.sin) });
  const s = useAnimatedStyle(() => ({ opacity: interpolate(t.get(), [0, 1], [0.35, 0.6]) }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }, s]}>
      <LinearGradient colors={["rgba(255,200,90,0.75)", "rgba(255,200,90,0)"]} start={{ x: 1, y: 0 }} end={{ x: 0.3, y: 0.8 }} style={{ flex: 1 }} />
    </Animated.View>
  );
}
function LightStreak({ y, delay, color, w }: { y: number; delay: number; color: string; w: number }) {
  const t = useLoop(1600, { delay });
  const s = useAnimatedStyle(() => ({ opacity: interpolate(t.get(), [0, 0.15, 0.85, 1], [0, 0.9, 0.9, 0]), transform: [{ translateX: interpolate(t.get(), [0, 1], [-160, w + 40]) }] }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top: y, width: 150, height: 3 }, s]}>
      <LinearGradient colors={["transparent", color, "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, borderRadius: 2 }} />
    </Animated.View>
  );
}
function MistBand({ top, delay, w }: { top: number; delay: number; w: number }) {
  const t = useLoop(16000, { delay });
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(t.get(), [0, 1], [-w * 0.9, w * 0.9]) }], opacity: interpolate(t.get(), [0, 0.2, 0.8, 1], [0, 0.55, 0.55, 0]) }));
  return (
    <Animated.View style={[{ position: "absolute", left: 0, top, width: w * 1.2, height: 70 }, s]}>
      <LinearGradient colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, borderRadius: 40 }} />
    </Animated.View>
  );
}

function Overlay({ service, w }: { service: ServiceId; w: number }) {
  if (service === "farm") return <><SunGlow />{Array.from({ length: 14 }, (_, i) => <DustMote key={i} x={i * 61} delay={i * 450} w={w} />)}</>;
  if (service === "ride") return <>{[[118, 0, "rgba(255,90,60,0.95)"], [132, 500, "rgba(255,240,200,0.95)"], [146, 900, "rgba(255,90,60,0.9)"], [160, 1300, "rgba(255,240,200,0.9)"]].map(([y, d, c]) => <LightStreak key={String(y)} y={y as number} delay={d as number} color={c as string} w={w} />)}</>;
  if (service === "travel") return <>{[40, 95].map((top, i) => <MistBand key={top} top={top} delay={i * 7000} w={w} />)}</>;
  return null;
}

function PhotoHero({ service, title, subtitle, custom }: { service: ServiceId; title: string; subtitle: string; custom?: string }) {
  const { width } = useWindowDimensions();
  const w = width - 32;
  const motion = useMotion();
  const still = motion === "off";
  const photos = useHeroPhotos(service, custom);
  const [idx, setIdx] = useState(0);
  const tilt = useTilt();

  useEffect(() => {
    if (still || !photos || photos.length < 2) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % photos.length), 7000);
    return () => clearInterval(id);
  }, [photos, still]);

  const card = useAnimatedStyle(() => ({ transform: [{ perspective: 900 }, { rotateY: `${tilt.x.get() * 4}deg` }, { rotateX: `${-tilt.y.get() * 3}deg` }] }));
  const svc = SERVICES[service];
  const current = photos?.[idx % (photos.length || 1)];
  const prev = photos && photos.length > 1 ? photos[(idx - 1 + photos.length) % photos.length] : undefined;

  // Still loading, or no photos available: fall back to the illustrated scene.
  if (photos === null || photos.length === 0) {
    if (service === "farm") return <FarmHero title={title} subtitle={subtitle} />;
    if (service === "ride") return <RideHero title={title} subtitle={subtitle} />;
    if (service === "travel") return <TravelHero title={title} subtitle={subtitle} />;
  }

  return (
    <Animated.View entering={FadeIn.duration(500)} style={[{ height: H, borderRadius: 26, overflow: "hidden", backgroundColor: svc.deep }, card]}>
      {prev && !still && <KenBurns key={`p${prev.url}`} url={prev.url} index={idx - 1} still />}
      {current && (
        <Animated.View key={current.url} entering={still ? undefined : FadeIn.duration(1400)} style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0 }}>
          <KenBurns url={current.url} index={idx} still={still || !!custom?.match(/\.(gif|webp)$/)} />
        </Animated.View>
      )}
      {!still && !custom && <Overlay service={service} w={w} />}
      <LinearGradient pointerEvents="none" colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.6)"]} style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 120 }} />
      <View style={{ position: "absolute", left: 20, bottom: 18, right: 20 }}>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: "#FFFFFF", fontSize: 26, fontWeight: "900", letterSpacing: -0.5, textShadowColor: "rgba(0,0,0,0.45)", textShadowRadius: 10 }}>{title}</Text>
        <Text numberOfLines={2} style={{ color: "rgba(255,255,255,0.92)", fontSize: 14, fontWeight: "600", textShadowColor: "rgba(0,0,0,0.4)", textShadowRadius: 6 }}>{subtitle}</Text>
      </View>
    </Animated.View>
  );
}

/** Still banner for "Animations: Off" on the illustrated worlds (Health, Dine). */
function StillHero({ service, title, subtitle }: { service: ServiceId; title: string; subtitle: string }) {
  const svc = SERVICES[service];
  return (
    <View style={{ height: H, borderRadius: 26, overflow: "hidden" }}>
      <LinearGradient colors={[svc.deep, svc.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, padding: 20, justifyContent: "flex-end" }}>
        <Text style={{ position: "absolute", right: 24, top: 18, fontSize: 64, opacity: 0.85 }}>{service === "health" ? "🩺" : "🍽"}</Text>
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ color: "#fff", fontSize: 26, fontWeight: "900" }}>{title}</Text>
        <Text numberOfLines={2} style={{ color: "rgba(255,255,255,0.9)", fontSize: 14, fontWeight: "600" }}>{subtitle}</Text>
      </LinearGradient>
    </View>
  );
}

export function HeroScene(props: { service: ServiceId; title: string; subtitle: string }) {
  return (
    <ParallaxHeader>
      <HeroBody {...props} />
    </ParallaxHeader>
  );
}

function HeroBody({ service, title, subtitle }: { service: ServiceId; title: string; subtitle: string }) {
  const { settings } = useAuth();
  const motion = useMotion();
  const custom = settings.banners[service];
  // A banner the user uploaded (photo or animated GIF) always wins.
  if (custom) return <PhotoHero service={service} title={title} subtitle={subtitle} custom={custom} />;
  if (service === "farm" || service === "ride" || service === "travel") return <PhotoHero service={service} title={title} subtitle={subtitle} />;
  if (motion === "off") return <StillHero service={service} title={title} subtitle={subtitle} />;
  if (service === "health") return <HealthHero title={title} subtitle={subtitle} />;
  return <DineHero title={title} subtitle={subtitle} />;
}
