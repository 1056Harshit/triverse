import { Alert, Pressable, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { SERVICES, SERVICE_IDS, type ServiceId } from "@triverse/shared";
import { AskFab } from "@/components/AskFab";
import { Wordmark } from "@/components/Logo";
import { Screen, useTheme } from "@/components/ui";
import { GlobeMark } from "@/components/motion/WelcomeHero";
import { Stagger } from "@/components/motion/Stagger";
import { Tilt3D } from "@/components/motion/Tilt3D";
import { warpTo } from "@/components/motion/WorldWarp";
import { ParallaxHeader } from "@/components/motion/scroll";
import { useAuth } from "@/lib/auth";

const ART: Record<ServiceId, string> = { farm: "🌾", ride: "🚗", dine: "🍽️", health: "🏥", travel: "✈️" };

/** The PvtFrnd home: your logo, every world as a big card, and quick actions. */
export default function HomeScreen() {
  return <View style={{ flex: 1 }}><Home /><AskFab /></View>;
}

function Home() {
  const t = useTheme();
  const { user, switchService, setServices } = useAuth();
  const { width } = useWindowDimensions();
  if (!user) return null;
  const mine = SERVICE_IDS.filter((s) => user.services.includes(s));
  const others = SERVICE_IDS.filter((s) => !user.services.includes(s));
  const first = user.name?.split(" ")[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const open = (s: ServiceId) => {
    warpTo(s, () => router.push(`/${s}`));
    switchService(s).catch(() => {});
  };
  const add = (s: ServiceId) => Alert.alert(`Add ${SERVICES[s].name}?`, SERVICES[s].tagline, [
    { text: "Not now", style: "cancel" },
    { text: "Yes, add it", onPress: async () => { await setServices([...user.services, s], s); open(s); } },
  ]);

  return (
    <Screen fab edges={["top", "bottom"]}>
      {/* Logo + greeting */}
      <ParallaxHeader>
        <View style={{ borderRadius: 28, overflow: "hidden" }}>
          <LinearGradient colors={["#0B3D23", "#14306E", "#6E2612"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ padding: 20, paddingBottom: 22 }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Wordmark size={24} onDark />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <RoundButton label="☀️" onPress={() => router.push("/today")} a11y="Your day" />
                <RoundButton label={(user.name ?? "?")[0]?.toUpperCase() ?? "?"} onPress={() => router.push("/profile")} a11y="Profile" />
              </View>
            </View>
            <View style={{ alignItems: "center", marginTop: 4, marginBottom: -10 }}>
              <GlobeMark size={Math.min(220, width * 0.52)} />
            </View>
            <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 15, fontWeight: "600" }}>{greet}{first ? `, ${first}` : ""} 👋</Text>
            <Text style={{ color: "#FFFFFF", fontSize: 26, fontWeight: "800", letterSpacing: -0.5, marginTop: 2 }}>Where to today?</Text>
          </LinearGradient>
        </View>
      </ParallaxHeader>

      {/* Your worlds */}
      <Stagger index={0}><Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>Your worlds</Text></Stagger>
      {mine.map((s, i) => {
        const svc = SERVICES[s];
        const current = s === user.activeService;
        return (
          <Stagger key={s} index={i + 1}>
            <Tilt3D onPress={() => open(s)} depth={8}>
              <LinearGradient colors={[svc.primary, svc.deep]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ borderRadius: 24, padding: 18, flexDirection: "row", alignItems: "center", gap: 16, minHeight: 104, overflow: "hidden" }}>
                <Text style={{ position: "absolute", right: -8, bottom: -18, fontSize: 96, opacity: 0.18 }}>{ART[s]}</Text>
                <View style={{ width: 58, height: 58, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.95)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 30 }}>{ART[s]}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ color: "#FFFFFF", fontSize: 20, fontWeight: "800" }}>{svc.name}</Text>
                    {current && <Text style={{ color: svc.deep, backgroundColor: "#FFFFFF", fontSize: 11, fontWeight: "800", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: "hidden" }}>LAST USED</Text>}
                  </View>
                  <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 13 }} numberOfLines={2}>{svc.tagline}</Text>
                </View>
                <Text style={{ color: "#FFFFFF", fontSize: 26, fontWeight: "300" }}>›</Text>
              </LinearGradient>
            </Tilt3D>
          </Stagger>
        );
      })}

      {/* Quick actions */}
      <Stagger index={mine.length + 1}>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Quick icon="🎙️" label="Ask Frnd" onPress={() => router.push({ pathname: "/chat/[agent]", params: { agent: "triverse" } })} />
          <Quick icon="☀️" label="Your day" onPress={() => router.push("/today")} />
          <Quick icon="⚙️" label="Settings" onPress={() => router.push("/settings")} />
        </View>
      </Stagger>

      {/* Worlds not added yet */}
      {others.length > 0 && (
        <Stagger index={mine.length + 2}>
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>Add more worlds</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
              {others.map((s) => (
                <Pressable key={s} onPress={() => add(s)}
                  style={({ pressed }) => ({ flexBasis: "46%", flexGrow: 1, borderRadius: 18, padding: 14, gap: 4, borderWidth: 1.5, borderStyle: "dashed", borderColor: SERVICES[s].primary, backgroundColor: t.card, opacity: pressed ? 0.8 : 1 })}>
                  <Text style={{ fontSize: 24 }}>{ART[s]}</Text>
                  <Text style={{ color: t.text, fontWeight: "800" }}>{SERVICES[s].name}</Text>
                  <Text style={{ color: SERVICES[s].deep, fontWeight: "700", fontSize: 12 }}>＋ Add</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </Stagger>
      )}
    </Screen>
  );
}

function RoundButton({ label, onPress, a11y }: { label: string; onPress: () => void; a11y: string }) {
  return (
    <Pressable accessibilityLabel={a11y} onPress={onPress} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.14)", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ color: "#FFFFFF", fontSize: 16, fontWeight: "800" }}>{label}</Text>
    </Pressable>
  );
}

function Quick({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, alignItems: "center", gap: 6, paddingVertical: 14, borderRadius: 18, backgroundColor: t.card, borderWidth: 1, borderColor: t.border, transform: [{ scale: pressed ? 0.96 : 1 }] })}>
      <Text style={{ fontSize: 22 }}>{icon}</Text>
      <Text style={{ color: t.text, fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}
