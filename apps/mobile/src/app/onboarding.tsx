import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, { FadeInUp } from "react-native-reanimated";
import { Haptics } from "@/lib/haptics";
import { SERVICES, SERVICE_IDS, type ServiceId } from "@triverse/shared";
import { PinMark } from "@/components/Logo";
import { Button, Field, H, P, useTheme } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const EMOJI: Record<ServiceId, string> = { farm: "🌾", ride: "🚗", dine: "🍽", health: "🩺", travel: "🏔" };
const DETAIL: Record<ServiceId, string> = {
  farm: "Photo diagnosis, safe pesticides at the best price, weather-smart tips",
  ride: "Verified drivers, fair cost-share prices, live trip safety",
  dine: "One honest TriScore from many review sites, near you",
  health: "Nearby hospitals with call & directions, reminders, report help",
  travel: "Day-by-day trip plans, sights with photos, weather alerts",
};

export default function Onboarding() {
  const t = useTheme();
  const { user, setServices } = useAuth();
  const [picked, setPicked] = useState<ServiceId[]>([]);
  const [name, setName] = useState(user?.name ?? "");
  const [busy, setBusy] = useState(false);

  const toggle = (s: ServiceId) => {
    Haptics.selectionAsync();
    setPicked((p) => (p.includes(s) ? p.filter((x) => x !== s) : [...p, s]));
  };

  const go = async () => {
    setBusy(true);
    try {
      if (name && name !== user?.name) await api("/me", { method: "PATCH", body: { name } });
      await setServices(picked, picked[0]);
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24, gap: 18 }} keyboardShouldPersistTaps="handled">
      <PinMark size={56} animate="intro" />
      <H level="hero">What brings you to TriVerse?</H>
      <P muted>Pick one or more. Only what you choose shows up, and you can switch any time from the pin at the top.</P>
      {!user?.name && <Field label="Your name" value={name} onChangeText={setName} placeholder="Harshit Gupta" autoComplete="name" />}
      <View style={{ gap: 12 }}>
        {SERVICE_IDS.map((s, i) => {
          const svc = SERVICES[s], on = picked.includes(s);
          return (
            <Animated.View key={s} entering={FadeInUp.delay(i * 120)}>
              <Pressable onPress={() => toggle(s)} style={({ pressed }) => ({
                flexDirection: "row", alignItems: "center", gap: 12, padding: 13, borderRadius: 20, borderWidth: 2.5,
                borderColor: on ? svc.primary : t.border, backgroundColor: on ? svc.tint : t.card, transform: [{ scale: pressed ? 0.98 : 1 }],
              })}>
                <Text style={{ fontSize: 30 }}>{EMOJI[s]}</Text>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: on ? svc.deep : t.text }}>{svc.name}</Text>
                  <Text style={{ fontSize: 13, color: on ? svc.deep : t.muted }}>{DETAIL[s]}</Text>
                </View>
                <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: on ? svc.primary : t.border, backgroundColor: on ? svc.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
                  {on && <Text style={{ color: "#fff", fontWeight: "900" }}>✓</Text>}
                </View>
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
      <View style={{ flex: 1, minHeight: 8 }} />
      <Button label={picked.length ? `Enter ${picked.length === 1 ? SERVICES[picked[0]].name : "TriVerse"}` : "Choose at least one"} onPress={go} loading={busy} disabled={!picked.length || (!user?.name && name.trim().length < 2)} />
      </ScrollView>
    </SafeAreaView>
  );
}
