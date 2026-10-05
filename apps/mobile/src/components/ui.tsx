import type { ReactNode } from "react";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { ActivityIndicator, Pressable, Text, TextInput, View, type TextInputProps, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Haptics } from "@/lib/haptics";
import { radius, space, type, usePalette, useTextScale, type Palette } from "@/lib/theme";
import { useActiveService } from "@/lib/auth";
import { Tilt3D } from "./motion/Tilt3D";
import { ScrollProvider } from "./motion/scroll";

export function useTheme(): Palette {
  return usePalette(useActiveService());
}

export function Screen({ children, scroll = true, padded = true, edges = ["bottom"], fab = false }: { children: ReactNode; scroll?: boolean; padded?: boolean; edges?: ("top" | "bottom")[]; fab?: boolean }) {
  const t = useTheme();
  const y = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => { y.set(e.contentOffset.y); });
  const inner = <View style={{ padding: padded ? space(4) : 0, paddingBottom: fab ? 110 : padded ? space(4) : 0, gap: space(4) }}>{children}</View>;
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollProvider value={scroll ? y : null}>
        {scroll
          ? <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16} contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled">{inner}</Animated.ScrollView>
          : <View style={{ flex: 1 }}>{inner}</View>}
      </ScrollProvider>
    </SafeAreaView>
  );
}

export function H({ children, level = "title", color, center }: { children: ReactNode; level?: keyof typeof type; color?: string; center?: boolean }) {
  const t = useTheme();
  const k = useTextScale();
  const base = type[level];
  return <Text style={[base, { fontSize: base.fontSize * k, color: color ?? t.text, textAlign: center ? "center" : "left" }]}>{children}</Text>;
}

export function P({ children, muted, center, small }: { children: ReactNode; muted?: boolean; center?: boolean; small?: boolean }) {
  const t = useTheme();
  const k = useTextScale();
  const base = small ? type.small : type.body;
  return <Text style={[base, { fontSize: base.fontSize * k, lineHeight: base.lineHeight * k, color: muted ? t.muted : t.text, textAlign: center ? "center" : "left" }]}>{children}</Text>;
}

export function Button({ label, onPress, variant = "primary", loading, disabled, icon, style }: {
  label: string; onPress: () => void; variant?: "primary" | "secondary" | "ghost" | "danger"; loading?: boolean; disabled?: boolean; icon?: ReactNode; style?: ViewStyle;
}) {
  const t = useTheme();
  const bg = variant === "primary" ? t.primary : variant === "danger" ? t.danger : variant === "secondary" ? t.tint : "transparent";
  const fg = variant === "primary" || variant === "danger" ? "#FFFFFF" : t.deep;
  return (
    <Pressable
      accessibilityRole="button" disabled={disabled || loading}
      onPress={() => { Haptics.selectionAsync(); onPress(); }}
      style={({ pressed }) => [{ backgroundColor: bg, borderRadius: radius.pill, paddingVertical: 15, paddingHorizontal: 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, overflow: "hidden", opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <>{icon}<ScaledText style={{ color: fg, fontSize: 16, fontWeight: "700" }}>{label}</ScaledText></>}
    </Pressable>
  );
}

export function Card({ children, style, onPress, tinted }: { children: ReactNode; style?: ViewStyle; onPress?: () => void; tinted?: boolean }) {
  const t = useTheme();
  const s: ViewStyle = { backgroundColor: tinted ? t.tint : t.card, borderRadius: radius.md, padding: space(4), borderWidth: tinted ? 0 : 1, borderColor: t.border, gap: space(2) };
  return onPress
    ? <Tilt3D onPress={onPress} depth={6}><View style={[s, style]}>{children}</View></Tilt3D>
    : <View style={[s, style]}>{children}</View>;
}

export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={[type.small, { color: t.muted, fontWeight: "600" }]}>{label}</Text>
      <TextInput placeholderTextColor={t.subtle} {...props}
        style={[{ backgroundColor: t.card, borderWidth: 1.5, borderColor: error ? t.danger : t.border, borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 13, fontSize: 16, color: t.text }, props.style]} />
      {error && <Text style={[type.small, { color: t.danger }]}>{error}</Text>}
    </View>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: selected ? t.primary : t.card, borderWidth: 1, borderColor: selected ? t.primary : t.border }}>
      <Text style={{ color: selected ? "#FFFFFF" : t.text, fontWeight: "600", fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, tone = "accent" }: { label: string; tone?: "accent" | "success" | "warning" | "muted" }) {
  const t = useTheme();
  const map = { accent: [t.tint, t.deep], success: ["#DCFCE7", "#15803D"], warning: ["#FEF3C7", "#B45309"], muted: [t.border, t.muted] } as const;
  const [bg, fg] = map[tone];
  return <View style={{ backgroundColor: bg, borderRadius: radius.pill, paddingHorizontal: 9, paddingVertical: 3, alignSelf: "flex-start" }}><Text style={{ color: fg, fontSize: 12, fontWeight: "700" }}>{label}</Text></View>;
}

export function Row({ children, gap = 3, style }: { children: ReactNode; gap?: number; style?: ViewStyle }) {
  return <View style={[{ flexDirection: "row", alignItems: "center", gap: space(gap) }, style]}>{children}</View>;
}

export function Tile({ emoji, title, subtitle, onPress }: { emoji: string; title: string; subtitle: string; onPress: () => void }) {
  const t = useTheme();
  return (
    // Half the row each (two per row); height comes from the content, equalised by the row's "stretch".
    <Tilt3D onPress={onPress} depth={14} style={{ flexBasis: "46%", flexGrow: 1 }}>
     <View style={{ flexGrow: 1, minHeight: 124, backgroundColor: t.card, borderRadius: radius.md, padding: space(4), gap: 6, borderWidth: 1, borderColor: t.border }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: t.tint, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 22 }}>{emoji}</Text></View>
      <ScaledText style={{ fontSize: 15, fontWeight: "700", color: t.text }}>{title}</ScaledText>
      <ScaledText style={{ fontSize: 12, lineHeight: 17, color: t.muted }}>{subtitle}</ScaledText>
     </View>
    </Tilt3D>
  );
}

/** Text that grows with the "Large text" setting. */
export function ScaledText({ style, children }: { style: { fontSize: number } & Record<string, unknown>; children: ReactNode }) {
  const k = useTextScale();
  return <Text style={[style, { fontSize: style.fontSize * k }]}>{children}</Text>;
}
