import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";
import { View } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown } from "react-native-reanimated";
import { useMotion } from "@/lib/theme";

/** Springs children in one after another. */
export function Stagger({ index, children, style }: { index: number; children: ReactNode; style?: ViewStyle }) {
  const motion = useMotion();
  if (motion === "off") return <View style={style}>{children}</View>;
  if (motion === "reduced") return <Animated.View entering={FadeIn.duration(200)} style={style}>{children}</Animated.View>;
  // A short ease-out (no spring overshoot) keeps sections from jumping while the page lays out.
  return <Animated.View entering={FadeInDown.delay(60 + Math.min(index, 8) * 60).duration(380).easing(Easing.out(Easing.cubic))} style={style}>{children}</Animated.View>;
}
