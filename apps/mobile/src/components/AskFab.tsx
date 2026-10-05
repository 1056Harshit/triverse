import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Haptics } from "@/lib/haptics";
import Animated, { Easing, FadeInUp, interpolate, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withTiming } from "react-native-reanimated";
import { BRAND } from "@triverse/shared";

/**
 * Floating "Ask Frnd" button on every dashboard.
 * Tap → opens the all-in-one assistant listening by voice. Long-press → type instead.
 */
export function AskFab() {
  const insets = useSafeAreaInsets();
  const ring = useSharedValue(0);
  useEffect(() => { ring.set(withDelay(800, withRepeat(withTiming(1, { duration: 1800, easing: Easing.out(Easing.quad) }), -1))); }, [ring]);
  const ringStyle = useAnimatedStyle(() => ({ opacity: interpolate(ring.get(), [0, 1], [0.5, 0]), transform: [{ scale: interpolate(ring.get(), [0, 1], [1, 1.6]) }] }));

  return (
    <Animated.View entering={FadeInUp.delay(600).springify()} style={{ position: "absolute", right: 16, bottom: Math.max(insets.bottom, 12) + 10, alignItems: "flex-end" }} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button" accessibilityLabel="Ask Frnd by voice"
        onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push({ pathname: "/chat/[agent]", params: { agent: "triverse", voice: "1" } }); }}
        onLongPress={() => router.push({ pathname: "/chat/[agent]", params: { agent: "triverse" } })}
        style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", transform: [{ scale: pressed ? 0.94 : 1 }] })}>
        <View style={{ backgroundColor: "rgba(15,23,42,0.88)", paddingVertical: 8, paddingLeft: 14, paddingRight: 26, borderRadius: 999, marginRight: -18 }}>
          <Text style={{ color: "#fff", fontWeight: "800", fontSize: 14 }}>Ask Frnd</Text>
        </View>
        <View style={{ width: 62, height: 62, alignItems: "center", justifyContent: "center" }}>
          <Animated.View style={[{ position: "absolute", width: 62, height: 62, borderRadius: 31, backgroundColor: BRAND.blue }, ringStyle]} />
          <LinearGradient colors={["#22A35A", "#2F6FEB", "#F2643D"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={{ width: 62, height: 62, borderRadius: 31, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff" }}>
            <Text style={{ fontSize: 26 }}>🎤</Text>
          </LinearGradient>
        </View>
      </Pressable>
    </Animated.View>
  );
}
