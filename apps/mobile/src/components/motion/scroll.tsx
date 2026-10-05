import { createContext, useContext, type ReactNode } from "react";
import { View, useWindowDimensions, type LayoutChangeEvent, type ViewStyle } from "react-native";
import Animated, { Extrapolation, interpolate, useAnimatedStyle, useSharedValue, type EntryExitAnimationFunction, type SharedValue } from "react-native-reanimated";
import { useMotion } from "@/lib/theme";

/** The current screen's scroll position (UI thread), shared with the animations inside it. */
const ScrollCtx = createContext<SharedValue<number> | null>(null);
export const ScrollProvider = ScrollCtx.Provider;
export const useScreenScroll = () => useContext(ScrollCtx);

/**
 * Scroll-linked reveal: the item rises, fades and un-tilts as it comes onto the screen, and
 * recedes slightly (smaller, dimmer) as it leaves at the top — so scrolling feels like depth.
 */
export function ScrollReveal({ children, style, entering }: { children: ReactNode; style?: ViewStyle; entering?: EntryExitAnimationFunction | object }) {
  const scroll = useScreenScroll();
  const motion = useMotion();
  const { height: vh } = useWindowDimensions();
  const top = useSharedValue(-1);
  const h = useSharedValue(0);
  const onLayout = (e: LayoutChangeEvent) => { top.set(e.nativeEvent.layout.y); h.set(e.nativeEvent.layout.height); };
  const full = motion === "full";

  const anim = useAnimatedStyle(() => {
    if (!scroll || motion === "off" || top.value < 0) return {};
    const y = scroll.value;
    // 0 → just below the screen, 1 → comfortably on screen.
    const enter = interpolate(y + vh - top.value, [0, 140], [0, 1], Extrapolation.CLAMP);
    // 1 → fully on screen, 0 → scrolled off the top.
    const leave = interpolate(top.value + h.value - y, [0, Math.max(h.value, 1) * 0.9], [0, 1], Extrapolation.CLAMP);
    if (!full) return { opacity: Math.min(enter, 0.4 + leave * 0.6) };
    return {
      opacity: Math.min(enter, 0.35 + leave * 0.65),
      transform: [
        { perspective: 900 },
        { translateY: (1 - enter) * 46 },
        { rotateX: `${(1 - enter) * 14}deg` },
        { scale: (0.94 + enter * 0.06) * (0.95 + leave * 0.05) },
      ],
    };
  });
  // Outer view measures where the item sits in the list; the inner views animate (entry once, then scroll).
  return (
    <View onLayout={onLayout} style={style}>
      <Animated.View entering={entering as never} style={{ flexGrow: 1 }}>
        <Animated.View style={[{ flexGrow: 1 }, anim]}>{children}</Animated.View>
      </Animated.View>
    </View>
  );
}

/** Parallax for the top banner: it lags behind the content, fades as you scroll, and stretches on pull-down. */
export function ParallaxHeader({ children, height = 220 }: { children: ReactNode; height?: number }) {
  const scroll = useScreenScroll();
  const motion = useMotion();
  const anim = useAnimatedStyle(() => {
    if (!scroll || motion === "off") return {};
    const y = scroll.value;
    if (motion === "reduced") return { opacity: interpolate(y, [0, height], [1, 0.3], Extrapolation.CLAMP) };
    return {
      opacity: interpolate(y, [0, height * 0.9], [1, 0.15], Extrapolation.CLAMP),
      transform: [
        { translateY: y > 0 ? y * 0.42 : y * 0.5 },
        { scale: y < 0 ? 1 + -y / 380 : interpolate(y, [0, height], [1, 0.92], Extrapolation.CLAMP) },
      ],
    };
  });
  return <Animated.View style={[{ zIndex: -1 }, anim]}>{children}</Animated.View>;
}
