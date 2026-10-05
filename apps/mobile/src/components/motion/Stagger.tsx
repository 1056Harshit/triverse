import type { ReactNode } from "react";
import type { ViewStyle } from "react-native";
import { View } from "react-native";
import { Easing, FadeIn, FadeInDown } from "react-native-reanimated";
import { useMotion } from "@/lib/theme";
import { ScrollReveal } from "./scroll";

/** Springs children in one after another. */
export function Stagger({ index, children, style }: { index: number; children: ReactNode; style?: ViewStyle }) {
  const motion = useMotion();
  if (motion === "off") return <View style={style}>{children}</View>;
  // Entering plays once on open; ScrollReveal then animates the item as it scrolls in and out of view.
  const entering = motion === "reduced"
    ? FadeIn.duration(200)
    : FadeInDown.delay(60 + Math.min(index, 8) * 60).duration(380).easing(Easing.out(Easing.cubic)); // ease-out, no overshoot
  return <ScrollReveal entering={entering} style={style}>{children}</ScrollReveal>;
}
