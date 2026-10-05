import { useEffect } from "react";
import { Text, View } from "react-native";
import Svg, { Circle, Path, Polygon } from "react-native-svg";
import Animated, { useAnimatedProps, useSharedValue, withDelay, withRepeat, withSequence, withSpring, withTiming, Easing } from "react-native-reanimated";
import { GradientText } from "./BrandGradient";
import { BRAND, CORE_SERVICES, SERVICES, type ServiceId } from "@triverse/shared";

const PIN = "M70 145 C50 115 28 100 28 75 A42 42 0 1 1 112 75 C112 100 90 115 70 145 Z";
const DOTS = [
  { key: "farm", cx: 70, cy: 62, color: SERVICES.farm.primary },
  { key: "ride", cx: 58, cy: 84, color: SERVICES.ride.primary },
  { key: "dine", cx: 82, cy: 84, color: SERVICES.dine.primary },
] as const;

const ACircle = Animated.createAnimatedComponent(Circle);

interface Props {
  size?: number;
  /** Highlights one service: its dot grows, the others fade, the pin takes its colour. */
  active?: ServiceId | "brand";
  /** "intro" pops the dots in once; "thinking" pulses them in sequence (AI typing). */
  animate?: "none" | "intro" | "thinking";
  onDark?: boolean;
}

const isCore = (s?: ServiceId | "brand"): s is (typeof CORE_SERVICES)[number] => !!s && (CORE_SERVICES as readonly string[]).includes(s);

function Dot({ d, i, active, animate }: { d: (typeof DOTS)[number]; i: number; active?: ServiceId | "brand"; animate: Props["animate"] }) {
  // Only the three founding worlds have their own dot; other services keep all three lit.
  const highlight = isCore(active) ? active : undefined;
  const isActive = !highlight || highlight === d.key;
  const base = !highlight ? 9 : isActive ? 13 : 8;
  const r = useSharedValue(animate === "intro" ? 0 : base);
  useEffect(() => {
    if (animate === "intro") r.set(withDelay(250 + i * 140, withSpring(base, { damping: 9 })));
    else if (animate === "thinking") r.set(withDelay(i * 180, withRepeat(withSequence(withTiming(base + 3, { duration: 320, easing: Easing.out(Easing.quad) }), withTiming(base - 1, { duration: 320 })), -1, true)));
    else r.set(withSpring(base));
  }, [animate, base]);
  const props = useAnimatedProps(() => ({ r: r.value }));
  return <ACircle cx={d.cx} cy={d.cy} fill={d.color} opacity={isActive ? 1 : 0.28} animatedProps={props} />;
}

export function PinMark({ size = 48, active, animate = "none", onDark }: Props) {
  const pinColor = onDark ? "#FFFFFF" : active && active !== "brand" ? SERVICES[active].deep : BRAND.navy;
  return (
    <Svg width={size * 0.8} height={size} viewBox="14 19 112 140">
      <Path d={PIN} fill={pinColor} />
      <Circle cx={70} cy={75} r={30} fill={onDark ? BRAND.navy : "#FFFFFF"} />
      {!isCore(active) && <Polygon points="70,62 58,84 82,84" fill="none" stroke="#CBD5E1" strokeWidth={3} strokeLinejoin="round" />}
      {DOTS.map((d, i) => <Dot key={d.key} d={d} i={i} active={active} animate={animate} />)}
    </Svg>
  );
}

export function Wordmark({ size = 28, onDark }: { size?: number; onDark?: boolean }) {
  // "Pvt" in solid ink, "Frnd" in the 3-colour brand gradient.
  return (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Text style={{ fontSize: size, fontWeight: "800", letterSpacing: -0.8, color: onDark ? "#FFFFFF" : BRAND.navy }}>Pvt</Text>
      <GradientText text="Frnd" size={size} />
    </View>
  );
}

export function Lockup({ size = 40, tagline = true }: { size?: number; tagline?: boolean }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: size * 0.25 }}>
      <PinMark size={size * 1.4} animate="intro" />
      <View>
        <Wordmark size={size * 0.8} />
        {tagline && <Text style={{ fontSize: size * 0.28, letterSpacing: 2, color: "#64748B", fontWeight: "600" }}>YOUR FRIEND FOR EVERYTHING</Text>}
      </View>
    </View>
  );
}
