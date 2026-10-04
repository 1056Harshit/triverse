import { useEffect, useState } from "react";
import { Text, View, type TextStyle, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { useTheme } from "../ui";

/** Shimmering placeholder block shown while content loads. */
export function Skeleton({ height = 16, width = "100%", radius = 10, style }: { height?: number; width?: number | `${number}%`; radius?: number; style?: ViewStyle }) {
  const t = useTheme();
  const x = useSharedValue(0);
  useEffect(() => { x.set(withRepeat(withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.quad) }), -1)); }, [x]);
  const shine = useAnimatedStyle(() => ({ transform: [{ translateX: interpolate(x.get(), [0, 1], [-300, 300]) }] }));
  return (
    <View style={[{ height, width, borderRadius: radius, backgroundColor: t.border, overflow: "hidden" }, style]}>
      <Animated.View style={[{ position: "absolute", top: 0, bottom: 0, width: 160 }, shine]}>
        <LinearGradient colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1 }} />
      </Animated.View>
    </View>
  );
}

/** A card-shaped skeleton (image, title, two lines). */
export function SkeletonCard({ image = true }: { image?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ backgroundColor: t.card, borderRadius: 16, padding: 16, gap: 10, borderWidth: 1, borderColor: t.border }}>
      {image && <Skeleton height={130} radius={12} />}
      <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
        <Skeleton height={48} width={48} radius={24} />
        <View style={{ flex: 1, gap: 8 }}><Skeleton height={16} width="70%" /><Skeleton height={12} width="45%" /></View>
      </View>
      <Skeleton height={12} width="90%" />
    </View>
  );
}

/** A number that counts up/down smoothly to `value`. */
export function CountUp({ value, prefix = "", suffix = "", duration = 600, style }: { value: number; prefix?: string; suffix?: string; duration?: number; style?: TextStyle }) {
  const [shown, setShown] = useState(value);
  useEffect(() => {
    const from = shown, start = Date.now();
    if (from === value) return;
    const id = setInterval(() => {
      const p = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (p >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
    // Only re-run when the target changes; `shown` is the animation's own state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);
  return <Text style={style}>{prefix}{shown.toLocaleString("en-IN")}{suffix}</Text>;
}

const CONFETTI = ["#22A35A", "#2F6FEB", "#F2643D", "#F5B700", "#A855F7", "#EC4899"];

/** One-shot burst of confetti, e.g. when a driver is verified. */
export function Confetti({ count = 36 }: { count?: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: 1, alignItems: "center" }}>
      {Array.from({ length: count }, (_, i) => <Piece key={i} i={i} />)}
    </View>
  );
}
function Piece({ i }: { i: number }) {
  const t = useSharedValue(0);
  const angle = (i / 36) * Math.PI * 2 + (i % 3) * 0.3;
  const dist = 120 + (i % 5) * 35;
  useEffect(() => { t.set(withDelay((i % 6) * 25, withTiming(1, { duration: 1500, easing: Easing.out(Easing.cubic) }))); }, [t, i]);
  const s = useAnimatedStyle(() => ({
    opacity: interpolate(t.get(), [0, 0.1, 0.8, 1], [0, 1, 1, 0]),
    transform: [
      { translateX: Math.cos(angle) * dist * t.get() },
      { translateY: Math.sin(angle) * dist * t.get() + 160 * t.get() * t.get() }, // gravity
      { rotate: `${t.get() * 540 * (i % 2 ? 1 : -1)}deg` },
    ],
  }));
  return <Animated.View style={[{ position: "absolute", top: 140, width: i % 3 ? 8 : 6, height: i % 3 ? 12 : 6, borderRadius: i % 3 ? 2 : 3, backgroundColor: CONFETTI[i % CONFETTI.length] }, s]} />;
}
