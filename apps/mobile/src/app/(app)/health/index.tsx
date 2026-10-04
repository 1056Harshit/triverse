import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import Animated, { FadeInDown, FadeOutLeft, LinearTransition } from "react-native-reanimated";
import type { Facility } from "@triverse/shared";
import { AskFab } from "@/components/AskFab";
import { FacilityCard } from "@/components/cards/AgentCards";
import { HeroScene } from "@/components/motion/HeroScene";
import { SkeletonCard } from "@/components/motion/Extras";
import { Stagger } from "@/components/motion/Stagger";
import { ServiceGate } from "@/components/ServiceGate";
import { Button, Card, Chip, H, P, Row, Screen, Tile, useTheme } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useHere } from "@/lib/location";

interface Reminder { id: string; medicine: string; dose: string | null; times: string[]; withFood: string | null }
const FILTERS = [["hospital", "🏥 Hospitals"], ["health", "🩺 All care"], ["pharmacy", "💊 Pharmacies"]] as const;
const ask = (prompt: string, scan = false) => router.push({ pathname: "/chat/[agent]", params: { agent: "health", prompt, ...(scan ? { scan: "1" } : {}) } });

export default function HealthScreen() {
  return <ServiceGate service="health"><View style={{ flex: 1 }}><Health /><AskFab /></View></ServiceGate>;
}

function Health() {
  const t = useTheme();
  const { user } = useAuth();
  const { here, denied } = useHere();
  const [kind, setKind] = useState<(typeof FILTERS)[number][0]>("hospital");
  const [govtOnly, setGovtOnly] = useState(false);
  const [result, setResult] = useState<{ key: string; list: Facility[] | null; error?: string } | null>(null);
  const key = here ? `${kind}:${here.lat.toFixed(3)},${here.lng.toFixed(3)}` : null;
  const current = result?.key === key ? result : null;

  const load = useCallback(() => {
    if (!here || !key) return;
    api<Facility[]>(`/facilities?kind=${kind}&lat=${here.lat}&lng=${here.lng}&radiusKm=15`)
      .then((list) => setResult({ key, list }))
      .catch((e) => setResult({ key, list: null, error: e instanceof ApiError ? e.message : "Couldn't load right now." }));
  }, [here, kind, key]);
  useEffect(load, [load]);

  const list = current?.list?.filter((f) => !govtOnly || f.ownership === "government");

  return (
    <Screen fab>
      <HeroScene service="health" title="Your health, close by" subtitle={`Namaste${user?.name ? `, ${user.name.split(" ")[0]}` : ""} · care near ${here?.label ?? "you"}`} />

      {/* Emergency: always first, always one tap */}
      <Stagger index={0}>
        <Row gap={2}>
          <Emergency label="Ambulance" number="108" emoji="🚑" color="#DC2626" />
          <Emergency label="Emergency" number="112" emoji="🆘" color="#EA580C" />
          <Emergency label="Health line" number="104" emoji="📞" color={t.deep} />
        </Row>
      </Stagger>

      <Stagger index={1}>
        <Row style={{ flexWrap: "wrap" }}>
          <Tile emoji="💬" title="Ask Sehat Saathi" subtitle="Symptoms, medicines, advice" onPress={() => ask("")} />
          <Tile emoji="🧾" title="Explain my report" subtitle="Photo of lab report or prescription" onPress={() => ask("Please explain this report in simple words.", true)} />
        </Row>
      </Stagger>

      <Stagger index={2}><Reminders /></Stagger>

      <Stagger index={3}>
        <H level="h3">Near you</H>
        <Row gap={2} style={{ flexWrap: "wrap", marginTop: 8 }}>
          {FILTERS.map(([id, label]) => <Chip key={id} label={label} selected={kind === id} onPress={() => setKind(id)} />)}
          <Chip label={govtOnly ? "✓ Govt only" : "Govt only"} selected={govtOnly} onPress={() => setGovtOnly(!govtOnly)} />
        </Row>
      </Stagger>

      {denied && <Card><P muted>Allow location to see hospitals and pharmacies near you.</P></Card>}
      {here && !current && <><SkeletonCard image={false} /><SkeletonCard image={false} /></>}
      {current?.error && <Card><P muted>{current.error}</P><Button label="Try again" variant="secondary" onPress={load} /></Card>}
      {list?.length === 0 && <Card><P muted>Nothing found within 15 km{govtOnly ? " (try turning off Govt only)" : ""}.</P></Card>}
      {list?.map((f, i) => <Stagger key={f.id} index={i}><FacilityCard f={f} service="health" /></Stagger>)}
      {list && list.length > 0 && <P small muted center>Data from {list[0].source === "google" ? "Google" : "OpenStreetMap contributors"}. Call ahead to confirm doctors and timings.</P>}
    </Screen>
  );
}

function Emergency({ label, number, emoji, color }: { label: string; number: string; emoji: string; color: string }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Call ${label} ${number}`} onPress={() => Linking.openURL(`tel:${number}`)}
      style={({ pressed }) => ({ flex: 1, backgroundColor: color, borderRadius: 18, paddingVertical: 14, alignItems: "center", gap: 2, transform: [{ scale: pressed ? 0.95 : 1 }] })}>
      <Text style={{ fontSize: 24 }}>{emoji}</Text>
      <Text style={{ color: "#fff", fontWeight: "900", fontSize: 20 }}>{number}</Text>
      <Text style={{ color: "rgba(255,255,255,0.9)", fontWeight: "700", fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

const TIME_CHOICES = ["07:00", "08:00", "13:00", "14:00", "20:00", "21:00"];

function Reminders() {
  const t = useTheme();
  const [items, setItems] = useState<Reminder[]>([]);
  const [adding, setAdding] = useState(false);
  const [medicine, setMedicine] = useState("");
  const [dose, setDose] = useState("");
  const [times, setTimes] = useState<string[]>(["08:00"]);
  const [food, setFood] = useState<"before" | "after" | "any">("after");
  const refresh = useCallback(() => { api<Reminder[]>("/reminders").then(setItems).catch(() => {}); }, []);
  useFocusEffect(refresh);

  const save = async () => {
    await api("/reminders", { body: { medicine: medicine.trim(), dose: dose.trim() || undefined, times: [...times].sort(), withFood: food } });
    setAdding(false); setMedicine(""); setDose(""); setTimes(["08:00"]);
    refresh();
  };
  const remove = async (id: string) => { setItems((x) => x.filter((r) => r.id !== id)); await api(`/reminders/${id}`, { method: "DELETE" }).catch(refresh); };

  return (
    <Card>
      <Row style={{ justifyContent: "space-between" }}>
        <H level="h3">💊 My medicines</H>
        {!adding && <Pressable onPress={() => setAdding(true)}><Text style={{ color: t.primary, fontWeight: "800" }}>+ Add</Text></Pressable>}
      </Row>
      {items.length === 0 && !adding && <P small muted>No reminders yet. Add your medicines and they'll show in "Your day" too.</P>}
      {items.map((r) => (
        <Animated.View key={r.id} entering={FadeInDown} exiting={FadeOutLeft} layout={LinearTransition}>
          <Row style={{ justifyContent: "space-between", paddingVertical: 6 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: t.text, fontWeight: "700" }}>{r.medicine}{r.dose ? ` · ${r.dose}` : ""}</Text>
              <Text style={{ color: t.muted, fontSize: 12 }}>{r.times.join(" · ")}{r.withFood && r.withFood !== "any" ? ` · ${r.withFood} food` : ""}</Text>
            </View>
            <Pressable accessibilityLabel={`Remove ${r.medicine}`} onPress={() => remove(r.id)}><Text style={{ fontSize: 18, color: t.muted }}>✕</Text></Pressable>
          </Row>
        </Animated.View>
      ))}
      {adding && (
        <Animated.View entering={FadeInDown} style={{ gap: 10 }}>
          <TextInput value={medicine} onChangeText={setMedicine} placeholder="Medicine name (e.g. Metformin)" placeholderTextColor={t.subtle}
            style={{ backgroundColor: t.bg, borderRadius: 12, padding: 12, fontSize: 16, color: t.text, borderWidth: 1, borderColor: t.border }} />
          <TextInput value={dose} onChangeText={setDose} placeholder="Dose (optional, e.g. 500 mg)" placeholderTextColor={t.subtle}
            style={{ backgroundColor: t.bg, borderRadius: 12, padding: 12, fontSize: 16, color: t.text, borderWidth: 1, borderColor: t.border }} />
          <Row gap={2} style={{ flexWrap: "wrap" }}>
            {TIME_CHOICES.map((tm) => <Chip key={tm} label={tm} selected={times.includes(tm)} onPress={() => setTimes((x) => (x.includes(tm) ? x.filter((y) => y !== tm) : [...x, tm]))} />)}
          </Row>
          <Row gap={2}>{(["before", "after", "any"] as const).map((f) => <Chip key={f} label={f === "any" ? "Any time" : `${f} food`} selected={food === f} onPress={() => setFood(f)} />)}</Row>
          <Row gap={2}>
            <Button style={{ flex: 1 }} label="Cancel" variant="ghost" onPress={() => setAdding(false)} />
            <Button style={{ flex: 1 }} label="Save" onPress={save} disabled={!medicine.trim() || times.length === 0} />
          </Row>
        </Animated.View>
      )}
    </Card>
  );
}
