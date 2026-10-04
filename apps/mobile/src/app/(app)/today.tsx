import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import * as Speech from "expo-speech";
import Animated, { Easing, FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { SERVICES, type ServiceId } from "@triverse/shared";
import { Skeleton } from "@/components/motion/Extras";
import { Stagger } from "@/components/motion/Stagger";
import { PinMark } from "@/components/Logo";
import { Card, H, P, Row, Screen, useTheme } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useHere } from "@/lib/location";

interface Brief {
  greeting: string; name: string | null; services: ServiceId[]; spoken: string;
  weather: { summary: string; next24h: { maxTempC: number; minTempC: number; rainMm: number }; sprayWindows: Array<{ start: string; end: string }> } | null;
  rides: Array<{ role: "passenger" | "driver"; when: string; route: string; code?: string; seatsBooked?: number }>;
  medicines: Array<{ time: string; medicine: string; dose: string | null; withFood: string | null }>;
  nextMedicine: { time: string; medicine: string } | null;
}

/** "Your day": one screen that pulls together every world. */
export default function Today() {
  const t = useTheme();
  const { user, switchService } = useAuth();
  const { here, denied } = useHere();
  const [b, setB] = useState<Brief | null>(null);
  const [speaking, setSpeaking] = useState(false);
  const sun = useSharedValue(0);
  useEffect(() => { sun.set(withRepeat(withTiming(1, { duration: 20000, easing: Easing.linear }), -1)); }, [sun]);
  const sunStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${sun.get() * 360}deg` }] }));

  useEffect(() => {
    if (!here && !denied) return;
    const q = here ? `?lat=${here.lat}&lng=${here.lng}` : "";
    api<Brief>(`/brief${q}`).then(setB).catch(() => {});
  }, [here, denied]);
  useEffect(() => () => { Speech.stop(); }, []);

  const listen = () => {
    if (!b) return;
    if (speaking) { Speech.stop(); setSpeaking(false); return; }
    setSpeaking(true);
    Speech.speak(b.spoken, { language: "en-IN", rate: 0.9, onDone: () => setSpeaking(false), onStopped: () => setSpeaking(false) });
  };
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric" });
  const open = async (s: ServiceId) => { await switchService(s); router.replace(`/${s}`); };

  return (
    <Screen>
      <Row style={{ justifyContent: "space-between" }}>
        <View style={{ flex: 1 }}>
          <P muted>{new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}</P>
          <H level="hero">{b?.greeting ?? "Hello"}{user?.name ? `, ${user.name.split(" ")[0]}` : ""}</H>
        </View>
        <Animated.Text style={[{ fontSize: 48 }, sunStyle]}>☀️</Animated.Text>
      </Row>

      <Pressable onPress={listen} disabled={!b} style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: t.primary, borderRadius: 999, paddingVertical: 14, justifyContent: "center", opacity: b ? (pressed ? 0.85 : 1) : 0.5 })}>
        <Text style={{ fontSize: 20 }}>{speaking ? "⏹" : "🔊"}</Text>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16 }}>{speaking ? "Stop" : "Read my day aloud"}</Text>
      </Pressable>

      {!b && <><Skeleton height={90} radius={16} /><Skeleton height={90} radius={16} /></>}

      {b?.weather && (
        <Stagger index={0}>
          <Card>
            <Text style={{ fontSize: 11, letterSpacing: 1.5, fontWeight: "800", color: t.muted }}>WEATHER · {here?.label?.toUpperCase() ?? ""}</Text>
            <Text style={{ fontSize: 26, fontWeight: "800", color: t.text }}>{Math.round(b.weather.next24h.maxTempC)}° <Text style={{ fontSize: 16, color: t.muted }}>/ {Math.round(b.weather.next24h.minTempC)}° · rain {b.weather.next24h.rainMm} mm</Text></Text>
            <P>{b.weather.summary}</P>
            {b.services.includes("farm") && b.weather.sprayWindows[0] && <P small>🌾 Spray window {fmt(b.weather.sprayWindows[0].start)}–{fmt(b.weather.sprayWindows[0].end)}</P>}
          </Card>
        </Stagger>
      )}

      {b && (
        <Stagger index={1}>
          <Card>
            <H level="h3">💊 Medicines today</H>
            {b.medicines.length === 0 ? <P small muted>No reminders. Add them in Health.</P> : b.medicines.map((m, i) => (
              <Row key={i} style={{ justifyContent: "space-between" }}>
                <Text style={{ color: t.text, fontWeight: b.nextMedicine?.time === m.time && b.nextMedicine.medicine === m.medicine ? "800" : "500" }}>{m.medicine}{m.dose ? ` · ${m.dose}` : ""}</Text>
                <Text style={{ color: t.muted, fontVariant: ["tabular-nums"] }}>{m.time}{b.nextMedicine?.time === m.time && b.nextMedicine.medicine === m.medicine ? " · next" : ""}</Text>
              </Row>
            ))}
          </Card>
        </Stagger>
      )}

      {b && (
        <Stagger index={2}>
          <Card>
            <H level="h3">🚗 Rides (next 48 h)</H>
            {b.rides.length === 0 ? <P small muted>Nothing booked.</P> : b.rides.map((r, i) => (
              <View key={i}><Text style={{ color: t.text, fontWeight: "700" }}>{r.route}</Text><P small muted>{r.when} · {r.role === "driver" ? `you're driving · ${r.seatsBooked} booked` : `booking ${r.code}`}</P></View>
            ))}
          </Card>
        </Stagger>
      )}

      {b && (
        <Stagger index={3}>
          <H level="h3">Jump to</H>
          <Row gap={2} style={{ flexWrap: "wrap", marginTop: 8 }}>
            {b.services.map((s) => (
              <Animated.View key={s} entering={FadeInDown.delay(300)}>
                <Pressable onPress={() => open(s)} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, backgroundColor: SERVICES[s].tint }}>
                  <PinMark size={22} active={s} />
                  <Text style={{ color: SERVICES[s].deep, fontWeight: "800" }}>{SERVICES[s].name}</Text>
                </Pressable>
              </Animated.View>
            ))}
          </Row>
        </Stagger>
      )}
    </Screen>
  );
}
