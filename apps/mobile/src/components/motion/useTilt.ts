import { useEffect } from "react";
import { Platform } from "react-native";
import { DeviceMotion } from "expo-sensors";
import { useSharedValue, withSpring, type SharedValue } from "react-native-reanimated";
import { useMotion } from "@/lib/theme";

/**
 * Device tilt as two springy values in [-1, 1]: x (left/right), y (forward/back).
 * Drives the parallax "depth" in hero scenes. Falls back to 0 where sensors are missing.
 */
export function useTilt(): { x: SharedValue<number>; y: SharedValue<number> } {
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const motion = useMotion();
  useEffect(() => {
    if (Platform.OS === "web" || motion !== "full") return;
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    let baseBeta: number | null = null;
    DeviceMotion.isAvailableAsync().then((ok) => {
      if (!ok || cancelled) return;
      DeviceMotion.setUpdateInterval(50);
      sub = DeviceMotion.addListener(({ rotation }) => {
        if (!rotation) return;
        // Measure forward/back tilt relative to how the phone was held when the screen opened.
        baseBeta ??= rotation.beta;
        const clamp = (v: number) => Math.max(-1, Math.min(1, v));
        x.set(withSpring(clamp(rotation.gamma / 0.6), { damping: 18, stiffness: 90 }));
        y.set(withSpring(clamp((rotation.beta - baseBeta) / 0.5), { damping: 18, stiffness: 90 }));
      });
    });
    return () => { cancelled = true; sub?.remove(); };
  }, [x, y, motion]);
  return { x, y };
}
