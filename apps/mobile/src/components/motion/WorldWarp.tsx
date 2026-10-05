import { useEffect, useState } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SERVICES, type ServiceId } from "@triverse/shared";
import { PinMark } from "@/components/Logo";
import { useMotion } from "@/lib/theme";

/**
 * Full-screen "world warp" played when switching worlds: a circle in the new world's colour bursts
 * out of the header pin, the pin pops in with the world's name and themed particles, then it opens
 * up onto the new dashboard. Call `warpTo(service, navigate)`; navigation happens while covered.
 */
type Listener = (s: ServiceId, navigate: () => void) => void;
let listener: Listener | null = null;

export function warpTo(service: ServiceId, navigate: () => void) {
  if (listener) listener(service, navigate);
  else navigate();
}

const PARTICLES: Record<ServiceId, string[]> = {
  farm: ["🌾", "🍃", "🌱", "🍅", "🌿", "☀️", "🍃", "🌾"],
  ride: ["🚗", "💨", "📍", "🛣️", "🚙", "💨", "🗺️", "🚗"],
  dine: ["🍕", "🍜", "☕", "🍰", "🍛", "⭐", "🥗", "🍽️"],
  health: ["❤️", "💊", "🩺", "➕", "💙", "🏥", "❤️", "💊"],
  travel: ["✈️", "🏔️", "🧭", "🌍", "📸", "☁️", "🏕️", "✈️"],
};

const COVER = 380, HOLD = 420, REVEAL = 420;

export function WorldWarp() {
  const motion = useMotion();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [world, setWorld] = useState<ServiceId | null>(null);
  const [run, setRun] = useState(0);

  const grow = useSharedValue(0);
  const fade = useSharedValue(0);
  const pin = useSharedValue(0);
  const burst = useSharedValue(0);

  // Circle starts at the header pin (top-left) and must cover the farthest corner.
  const ox = 34, oy = insets.top + 28;
  const radius = Math.hypot(width - ox, height - oy) + 40;

  useEffect(() => {
    listener = (s, navigate) => {
      if (motion === "off") { navigate(); return; }
      setWorld(s);
      setRun((r) => r + 1);
      const reduced = motion === "reduced";
      grow.set(reduced ? 1 : 0);
      fade.set(0);
      pin.set(0);
      burst.set(0);
      if (!reduced) grow.set(withTiming(1, { duration: COVER, easing: Easing.out(Easing.cubic) }));
      pin.set(withDelay(reduced ? 0 : COVER * 0.55, withSpring(1, { damping: 11, stiffness: 140 })));
      burst.set(withDelay(COVER * 0.6, withTiming(1, { duration: COVER + HOLD, easing: Easing.out(Easing.quad) })));
      // Swap the screen underneath while it's fully covered, then reveal.
      setTimeout(navigate, reduced ? 180 : COVER);
      setTimeout(() => setWorld(null), (reduced ? 180 : COVER) + HOLD + REVEAL + 60);
      fade.set(withSequence(
        withTiming(1, { duration: reduced ? 180 : COVER }),
        withDelay(HOLD, withTiming(0, { duration: REVEAL, easing: Easing.inOut(Easing.cubic) })),
      ));
    };
    return () => { listener = null; };
  }, [motion, grow, fade, pin, burst]);

  const circle = useAnimatedStyle(() => ({ transform: [{ scale: 0.001 + grow.value }] }));
  const overlay = useAnimatedStyle(() => ({ opacity: fade.value, transform: [{ scale: 1 + (1 - fade.value) * 0.06 * grow.value }] }));
  const pinStyle = useAnimatedStyle(() => ({ opacity: pin.value, transform: [{ scale: 0.4 + pin.value * 0.6 }, { rotateZ: `${(1 - pin.value) * -25}deg` }] }));

  if (!world) return null;
  const svc = SERVICES[world];
  return (
    <Animated.View key={run} pointerEvents="none" style={[{ position: "absolute", left: 0, top: 0, width, height, zIndex: 1000, overflow: "hidden" }, overlay]}>
      <Animated.View style={[{ position: "absolute", left: ox - radius, top: oy - radius, width: radius * 2, height: radius * 2, borderRadius: radius, backgroundColor: svc.primary }, circle]} />
      <Animated.View style={[{ position: "absolute", left: ox - radius * 0.7, top: oy - radius * 0.7, width: radius * 1.4, height: radius * 1.4, borderRadius: radius, backgroundColor: svc.deep, opacity: 0.35 }, circle]} />
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        {PARTICLES[world].map((e, i) => <Particle key={i} emoji={e} index={i} total={PARTICLES[world].length} burst={burst} />)}
        <Animated.View style={[{ alignItems: "center", gap: 14 }, pinStyle]}>
          <View style={{ width: 132, height: 132, borderRadius: 66, backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center" }}>
            <PinMark size={78} active={world} />
          </View>
          <Text style={{ color: "#fff", fontSize: 30, fontWeight: "800", letterSpacing: -0.5 }}>{svc.name}</Text>
          <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center", paddingHorizontal: 40 }}>{svc.tagline}</Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

function Particle({ emoji, index, total, burst }: { emoji: string; index: number; total: number; burst: ReturnType<typeof useSharedValue<number>> }) {
  const angle = (index / total) * Math.PI * 2 + (index % 2 ? 0.3 : -0.2);
  const dist = 120 + (index % 3) * 40;
  const spin = (index % 2 ? 1 : -1) * (90 + index * 20);
  const style = useAnimatedStyle(() => {
    const p = burst.value;
    return {
      opacity: p < 0.15 ? p / 0.15 : 1 - Math.max(0, (p - 0.6) / 0.4),
      transform: [
        { translateX: Math.cos(angle) * dist * p },
        { translateY: Math.sin(angle) * dist * p - 20 * p },
        { rotateZ: `${spin * p}deg` },
        { scale: 0.5 + p * 0.7 },
      ],
    };
  });
  return <Animated.Text style={[{ position: "absolute", fontSize: 30 }, style]}>{emoji}</Animated.Text>;
}
