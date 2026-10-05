import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInRight } from "react-native-reanimated";
import type { Facility } from "@triverse/shared";
import { AskFab } from "@/components/AskFab";
import { FacilityCard } from "@/components/cards/AgentCards";
import { HeroScene } from "@/components/motion/HeroScene";
import { SkeletonCard } from "@/components/motion/Extras";
import { Stagger } from "@/components/motion/Stagger";
import { ServiceGate } from "@/components/ServiceGate";
import { Button, Card, Chip, H, P, Row, Screen, useTheme } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useHere } from "@/lib/location";

/** Popular Himachal trips; tapping one asks Travel Frnd for a full plan. */
const DESTINATIONS: Array<{ name: string; emoji: string; line: string; season: string; colors: [string, string] }> = [
  { name: "Manali", emoji: "🏔", line: "Solang, Old Manali, Atal Tunnel", season: "Oct–Jun", colors: ["#1E3A8A", "#60A5FA"] },
  { name: "Kasol", emoji: "🌲", line: "Parvati valley, cafés, Kheerganga", season: "Mar–Jun, Sep–Nov", colors: ["#14532D", "#4ADE80"] },
  { name: "Dharamshala", emoji: "🛕", line: "McLeodganj, Triund trek", season: "Mar–Jun, Sep–Dec", colors: ["#7C2D12", "#FB923C"] },
  { name: "Spiti Valley", emoji: "🏜", line: "High desert, Key monastery", season: "Jun–Sep", colors: ["#78350F", "#FBBF24"] },
  { name: "Bir Billing", emoji: "🪂", line: "Paragliding capital of India", season: "Oct–Nov, Mar–May", colors: ["#4C1D95", "#A78BFA"] },
  { name: "Dalhousie", emoji: "🌄", line: "Khajjiar meadows, colonial hills", season: "Mar–Jun", colors: ["#134E4A", "#2DD4BF"] },
  { name: "Kasauli", emoji: "🌁", line: "Quiet colonial town, sunset point", season: "All year", colors: ["#831843", "#F472B6"] },
];

const TIPS = [
  "🚗 Rohtang Pass needs an online permit; Atal Tunnel is open most of the year.",
  "🌙 Drive hill roads in daylight; landslides are common after heavy rain.",
  "🏧 Carry cash for Spiti and Kinnaur: ATMs are few and networks patchy.",
  "🫁 Above 3,000 m, rest on day one and drink water to avoid altitude sickness.",
  "🧥 Pack warm layers even in summer: nights in the hills get cold.",
];

const plan = (prompt: string) => router.push({ pathname: "/chat/[agent]", params: { agent: "travel", prompt } });

export default function TravelScreen() {
  return <ServiceGate service="travel"><View style={{ flex: 1 }}><Travel /><AskFab /></View></ServiceGate>;
}

function Travel() {
  const t = useTheme();
  const { here, denied } = useHere();
  const [dest, setDest] = useState("");
  const [days, setDays] = useState(3);
  const [kind, setKind] = useState<"sights" | "stays">("sights");
  const [result, setResult] = useState<{ key: string; list: Facility[] | null; error?: string } | null>(null);
  const key = here ? `${kind}:${here.lat.toFixed(3)},${here.lng.toFixed(3)}` : null;
  const current = result?.key === key ? result : null;
  const from = here?.label ? ` from ${here.label.split(",")[0]}` : "";

  const load = useCallback(() => {
    if (!here || !key) return;
    api<Facility[]>(`/facilities?kind=${kind}&lat=${here.lat}&lng=${here.lng}&radiusKm=20`)
      .then((list) => setResult({ key, list }))
      .catch((e) => setResult({ key, list: null, error: e instanceof ApiError ? e.message : "Couldn't load right now." }));
  }, [here, kind, key]);
  useEffect(load, [load]);

  return (
    <Screen fab>
      <HeroScene service="travel" title="Where to next?" subtitle="Plans, sights and weather, all in one" />

      <Stagger index={0}>
        <Card>
          <H level="h3">✨ Plan a trip</H>
          <TextInput value={dest} onChangeText={setDest} placeholder="Destination (e.g. Manali)" placeholderTextColor={t.subtle}
            style={{ backgroundColor: t.bg, borderRadius: 12, padding: 13, fontSize: 16, color: t.text, borderWidth: 1, borderColor: t.border }} />
          <Row gap={2}>{[2, 3, 5, 7].map((d) => <Chip key={d} label={`${d} days`} selected={days === d} onPress={() => setDays(d)} />)}</Row>
          <P small muted>Costs in plans are estimates and not confirmed.</P>
          <Button label="Plan it with Travel Frnd" disabled={dest.trim().length < 2} onPress={() => plan(`Plan a ${days}-day trip to ${dest.trim()}${from} for 2 people: route, stays, food, sights, weather and a budget.`)} />
        </Card>
      </Stagger>

      <Stagger index={1}><H level="h3">Popular in Himachal</H></Stagger>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingRight: 8 }} style={{ marginHorizontal: -4 }}>
        {DESTINATIONS.map((d, i) => (
          <Animated.View key={d.name} entering={FadeInRight.delay(200 + i * 80).springify()}>
            <Pressable onPress={() => plan(`Plan a 3-day trip to ${d.name}${from} for 2 people with a budget.`)} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.96 : 1 }] })}>
              <LinearGradient colors={d.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 170, height: 150, borderRadius: 20, padding: 14, justifyContent: "space-between" }}>
                <Text style={{ fontSize: 34 }}>{d.emoji}</Text>
                <View>
                  <Text style={{ color: "#fff", fontWeight: "900", fontSize: 18 }}>{d.name}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.88)", fontSize: 12 }} numberOfLines={1}>{d.line}</Text>
                  <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 2 }}>Best: {d.season}</Text>
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        ))}
      </ScrollView>

      <Stagger index={2}>
        <Row style={{ justifyContent: "space-between" }}>
          <H level="h3">Around you</H>
          <Row gap={2}>
            <Chip label="📸 Sights" selected={kind === "sights"} onPress={() => setKind("sights")} />
            <Chip label="🏨 Stays" selected={kind === "stays"} onPress={() => setKind("stays")} />
          </Row>
        </Row>
      </Stagger>
      {denied && <Card><P muted>Allow location to see sights and stays near you.</P></Card>}
      {here && !current && <><SkeletonCard image={false} /><SkeletonCard image={false} /></>}
      {current?.error && <Card><P muted>{current.error}</P><Button label="Try again" variant="secondary" onPress={load} /></Card>}
      {current?.list?.length === 0 && <Card><P muted>Nothing listed within 20 km yet. Ask Travel Frnd for ideas.</P></Card>}
      {current?.list?.map((f, i) => <Stagger key={f.id} index={i}><FacilityCard f={f} service="travel" /></Stagger>)}

      <Stagger index={3}>
        <Card tinted>
          <H level="h3">🎒 Travel smart</H>
          {TIPS.map((tip) => <P key={tip} small>{tip}</P>)}
        </Card>
      </Stagger>
    </Screen>
  );
}
