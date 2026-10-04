import type { ReactNode } from "react";
import { Pressable, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { Haptics } from "@/lib/haptics";
import { useMotion } from "@/lib/theme";

/** A pressable card that leans toward your finger in 3D and springs back. */
export function Tilt3D({ children, onPress, style, depth = 10 }: { children: ReactNode; onPress?: () => void; style?: ViewStyle; depth?: number }) {
  const rx = useSharedValue(0), ry = useSharedValue(0), s = useSharedValue(1);
  const size = useSharedValue({ w: 1, h: 1 });
  const lean = useMotion() === "full" ? depth : 0;

  const anim = useAnimatedStyle(() => ({
    transform: [{ perspective: 700 }, { rotateX: `${rx.get()}deg` }, { rotateY: `${ry.get()}deg` }, { scale: s.get() }],
  }));

  return (
    <Animated.View style={[anim, style]} onLayout={(e) => { size.set({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }); }}>
      <Pressable
        onPressIn={(e) => {
          const { locationX, locationY } = e.nativeEvent;
          const { w, h } = size.get();
          ry.set(withSpring(((locationX / w) - 0.5) * lean));
          rx.set(withSpring(-((locationY / h) - 0.5) * lean));
          s.set(withSpring(0.97));
          Haptics.selectionAsync();
        }}
        onPressOut={() => { rx.set(withSpring(0)); ry.set(withSpring(0)); s.set(withSpring(1)); }}
        onPress={onPress}
        style={{ flex: 1 }}>
        {children}
      </Pressable>
    </Animated.View>
  );
}
