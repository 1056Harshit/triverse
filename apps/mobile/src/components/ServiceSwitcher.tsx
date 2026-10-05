import { useEffect, useState } from "react";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { Modal, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Haptics } from "@/lib/haptics";
import { SERVICES, SERVICE_IDS, type ServiceId } from "@triverse/shared";
import { useAuth } from "@/lib/auth";
import { PinMark, Wordmark } from "./Logo";
import { warpTo } from "./motion/WorldWarp";
import { useTheme } from "./ui";

/** The pin in the header: tap to switch between Farm, Ride and Dine. */
export function ServiceSwitcher() {
  const { user, switchService } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState<ServiceId | null>(null);
  const t = useTheme();
  const active = user?.activeService ?? "farm";
  const spin = useSharedValue(0);
  useEffect(() => { spin.set(withSequence(withTiming(0, { duration: 0 }), withSpring(360, { damping: 12, stiffness: 80 }))); }, [active, spin]);
  const pinStyle = useAnimatedStyle(() => ({ transform: [{ perspective: 400 }, { rotateY: `${spin.value}deg` }] }));

  const close = () => { setOpen(false); setConfirm(null); };
  const go = async (s: ServiceId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    close();
    if (s === active) return;
    warpTo(s, () => router.replace(`/${s}`));
    await switchService(s);
  };
  // Services the user didn't choose stay locked until they confirm adding them.
  const pick = (s: ServiceId) => {
    if (user?.services.includes(s)) return go(s);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setConfirm(s);
  };

  return (
    <>
      <Pressable accessibilityLabel="Switch service" onPress={() => setOpen(true)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
        <Animated.View style={pinStyle}><PinMark size={30} active={active} /></Animated.View>
        <Wordmark size={20} />
        <Text style={{ color: t.muted, fontSize: 12 }}>▼</Text>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable onPress={close} style={{ flex: 1, backgroundColor: t.overlay, justifyContent: "flex-end" }}>
          <Pressable style={{ backgroundColor: t.card, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, gap: 12 }}>
            <View style={{ alignSelf: "center", width: 44, height: 5, borderRadius: 3, backgroundColor: t.border, marginBottom: 6 }} />
            {confirm ? (
              <View style={{ gap: 14, alignItems: "center", paddingVertical: 8 }}>
                <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: SERVICES[confirm].tint, alignItems: "center", justifyContent: "center" }}>
                  <PinMark size={46} active={confirm} />
                </View>
                <Text style={{ fontSize: 20, fontWeight: "800", color: t.text, textAlign: "center" }}>You haven't selected {SERVICES[confirm].name}</Text>
                <Text style={{ fontSize: 14, color: t.muted, textAlign: "center" }}>Do you want to add {SERVICES[confirm].name} to your TriVerse?</Text>
                <View style={{ flexDirection: "row", gap: 10, alignSelf: "stretch" }}>
                  <Pressable onPress={() => setConfirm(null)} style={{ flex: 1, paddingVertical: 14, borderRadius: 999, borderWidth: 1.5, borderColor: t.border, alignItems: "center" }}>
                    <Text style={{ fontWeight: "700", color: t.text }}>No</Text>
                  </Pressable>
                  <Pressable onPress={() => go(confirm)} style={{ flex: 1, paddingVertical: 14, borderRadius: 999, backgroundColor: SERVICES[confirm].primary, alignItems: "center" }}>
                    <Text style={{ fontWeight: "800", color: "#fff" }}>Yes, add it</Text>
                  </Pressable>
                </View>
              </View>
            ) : <>
            <Text style={{ fontSize: 20, fontWeight: "800", color: t.text }}>Switch your world</Text>
            {SERVICE_IDS.map((s) => {
              const svc = SERVICES[s];
              const on = s === active;
              const added = user?.services.includes(s);
              return (
                <Pressable key={s} onPress={() => pick(s)}
                  style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 14, padding: 14, borderRadius: 18, backgroundColor: on ? svc.tint : "transparent", borderWidth: 2, borderColor: on ? svc.primary : t.border, opacity: pressed ? 0.8 : 1 })}>
                  <PinMark size={40} active={s} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "700", color: on ? svc.deep : t.text }}>{svc.name}</Text>
                    <Text style={{ fontSize: 13, color: on ? svc.deep : t.muted }}>{added ? svc.tagline : "Not selected · tap to add"}</Text>
                  </View>
                  {on ? <Text style={{ color: svc.deep, fontWeight: "800" }}>✓</Text> : !added && <Text style={{ fontSize: 16 }}>🔒</Text>}
                </Pressable>
              );
            })}
            </>}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}
