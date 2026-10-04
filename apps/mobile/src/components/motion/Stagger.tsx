import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";
import { View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useMotion } from "@/lib/theme";

/** Springs children in one after another. */
export function Stagger({ index, children, style }: { index: number; children: ReactNode; style?: ViewStyle }) {
  const motion = useMotion();
  if (motion === "off") return <View style={style}>{children}</View>;
  if (motion === "reduced") return <Animated.View entering={FadeIn.duration(200)} style={style}>{children}</Animated.View>;
  return <Animated.View entering={FadeInDown.delay(120 + index * 90).springify().damping(14)} style={style}>{children}</Animated.View>;
}
