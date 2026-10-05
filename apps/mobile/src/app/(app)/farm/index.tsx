import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { Card, H, P, Row, Screen, Tile, useTheme } from "@/components/ui";
import { PinMark } from "@/components/Logo";
import { ServiceGate } from "@/components/ServiceGate";
import { AskFab } from "@/components/AskFab";
import { HeroScene } from "@/components/motion/HeroScene";
import { Stagger } from "@/components/motion/Stagger";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useHere } from "@/lib/location";
import { CountUp } from "@/components/motion/Extras";

interface Weather { summary: string; next24h: { maxTempC: number; minTempC: number; rainMm: number; maxWindKmh: number }; sprayWindows: { start: string; end: string }[] }

const ask = (prompt: string) => router.push({ pathname: "/chat/[agent]", params: { agent: "farm", prompt } });

function season(month = new Date().getMonth()) {
  if (month >= 5 && month <= 8) return { name: "Kharif", tip: "Watch for blast in paddy and fall armyworm in maize after humid spells." };
  if (month >= 9 || month <= 1) return { name: "Rabi", tip: "Sowing time for wheat, mustard and gram. Treat seed before sowing." };
  return { name: "Zaid", tip: "Short-season vegetables and fodder. Irrigate early morning to cut losses." };
}

export default function FarmScreen() {
  return <ServiceGate service="farm"><View style={{ flex: 1 }}><Farm /><AskFab /></View></ServiceGate>;
}

function Farm() {
  const t = useTheme();
  const { user } = useAuth();
  const { here, denied } = useHere();
  const [w, setW] = useState<Weather | null>(null);
  const s = season();

  useEffect(() => { if (here) api<Weather>(`/farm/weather?lat=${here.lat}&lng=${here.lng}`).then(setW).catch(() => {}); }, [here]);
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric" });

  return (
    <Screen fab>
      <HeroScene service="farm" title="Your farm today" subtitle={`Namaste${user?.name ? `, ${user.name.split(" ")[0]}` : ""} 🙏`} />

      <Stagger index={0}><Card tinted onPress={() => router.push({ pathname: "/chat/[agent]", params: { agent: "farm", scan: "1" } })} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Text style={{ fontSize: 44 }}>📸</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: "800", color: t.deep }}>Scan a sick plant</Text>
          <Text style={{ color: t.deep, opacity: 0.85 }}>Take a photo. Farm Frnd tells you what's wrong and what to do.</Text>
        </View>
      </Card></Stagger>

      <Stagger index={1}><Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Text style={{ fontSize: 11, letterSpacing: 1.5, fontWeight: "800", color: t.muted }}>WEATHER · {here?.label?.toUpperCase() ?? "YOUR AREA"}</Text>
          <Text style={{ fontSize: 22 }}>{w ? (w.next24h.rainMm > 2 ? "🌧" : "☀️") : "⛅"}</Text>
        </Row>
        {w ? (
          <>
            <Row gap={5}>
              <Row gap={1}><CountUp value={Math.round(w.next24h.maxTempC)} suffix="°" style={{ fontSize: 28, fontWeight: "800", color: t.text }} /><Text style={{ fontSize: 18, color: t.muted }}>/ {Math.round(w.next24h.minTempC)}°</Text></Row>
              <View><P small muted>Rain {w.next24h.rainMm} mm</P><P small muted>Wind up to {Math.round(w.next24h.maxWindKmh)} km/h</P></View>
            </Row>
            <P>{w.summary}</P>
            {w.sprayWindows.map((sw) => (
              <View key={sw.start} style={{ backgroundColor: t.tint, borderRadius: 12, padding: 10 }}>
                <Text style={{ color: t.deep, fontWeight: "700" }}>✅ Spray window: {new Date(sw.start).toLocaleDateString("en-IN", { weekday: "short" })} {fmt(sw.start)}–{fmt(sw.end)}</Text>
              </View>
            ))}
          </>
        ) : <P muted>{denied ? "Allow location to see local weather and spray windows." : "Loading local forecast…"}</P>}
      </Card></Stagger>

      <Stagger index={2}><Row style={{ flexWrap: "wrap", alignItems: "stretch" }}>
        <Tile emoji="💬" title="Ask Farm Frnd" subtitle="Any crop question, any language" onPress={() => ask("")} />
        <Tile emoji="🧪" title="Find pesticide" subtitle="Registered only, best price" onPress={() => ask("I need a pesticide for my crop. Where can I buy it online, at what price, and how do I use it safely?")} />
        <Tile emoji="🗓" title="Crop calendar" subtitle={`${s.name} season plan`} onPress={() => ask(`Give me a ${s.name} season crop calendar for my area with sowing, fertiliser and spray dates.`)} />
        <Tile emoji="🏛" title="Schemes" subtitle="PM-KISAN, PMFBY, subsidies" onPress={() => ask("Which government schemes and subsidies can I apply for as a farmer in my state, and how?")} />
      </Row></Stagger>

      <Stagger index={3}><Card>
        <Row><PinMark size={28} active="farm" /><H level="h3">{s.name} season tip</H></Row>
        <P>{s.tip}</P>
      </Card></Stagger>
      <P small muted center>Advice is AI-generated. For severe outbreaks contact your KVK or Kisan Call Centre 1800-180-1551.</P>
    </Screen>
  );
}
