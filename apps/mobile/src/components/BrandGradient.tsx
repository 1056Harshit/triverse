import type { ReactNode } from "react";
import { View, type ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Defs, LinearGradient as SvgGradient, Stop, Text as SvgText } from "react-native-svg";
import { BRAND } from "@triverse/shared";

/** The brand's 3-colour gradient (green → blue → orange) as a fill behind children. */
export function GradientFill({ children, style, deep, vertical }: { children?: ReactNode; style?: ViewStyle; deep?: boolean; vertical?: boolean }) {
  return (
    <LinearGradient colors={[...(deep ? BRAND.gradientDeep : BRAND.gradient)]} start={{ x: 0, y: 0 }} end={vertical ? { x: 0.3, y: 1 } : { x: 1, y: 0.4 }} style={style}>
      {children}
    </LinearGradient>
  );
}

/** A thin gradient line, used under headers and banners. */
export function GradientBar({ height = 3, style }: { height?: number; style?: ViewStyle }) {
  return <GradientFill style={{ height, borderRadius: height, ...style }} />;
}

/** Text filled with the brand gradient (SVG, so it works on Android, iOS and web). */
export function GradientText({ text, size, weight = "800" }: { text: string; size: number; weight?: "700" | "800" | "900" }) {
  const width = Math.ceil(text.length * size * 0.64);
  const height = Math.ceil(size * 1.3);
  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgGradient id="brandText" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={BRAND.gradient[0]} />
            <Stop offset="0.5" stopColor={BRAND.gradient[1]} />
            <Stop offset="1" stopColor={BRAND.gradient[2]} />
          </SvgGradient>
        </Defs>
        <SvgText x="0" y={size * 1.02} fontSize={size} fontWeight={weight} letterSpacing={-0.8} fill="url(#brandText)">{text}</SvgText>
      </Svg>
    </View>
  );
}
