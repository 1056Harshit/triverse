import { useEffect, useState } from "react";
import { Alert, Platform, Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button, Card, Chip, H, P, Row, Screen, useTheme } from "@/components/ui";
import { PlaceInput, type Place } from "@/components/PlaceInput";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { CountUp } from "@/components/motion/Extras";
import { Stagger } from "@/components/motion/Stagger";
import Animated, { ZoomIn } from "react-native-reanimated";

interface Estimate { route: { distanceKm: number; durationMin: number; tollsInr: number; hillRoute: boolean }; suggestedSeatPrice: number; maxSeatPrice: number; bus: { volvo: number; acDeluxe: number; ordinary: number } }

export default function Offer() {
  const t = useTheme();
  const { user } = useAuth();
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [stops, setStops] = useState<(Place | null)[]>([]);
  const [when, setWhen] = useState(() => { const d = new Date(Date.now() + 86_400_000); d.setHours(7, 30, 0, 0); return d; });
  const [picker, setPicker] = useState<"date" | "time" | null>(null);
  const [seats, setSeats] = useState(3);
  const [est, setEst] = useState<Estimate | null>(null);
  const [price, setPrice] = useState(0);
  const [rules, setRules] = useState({ smoking: false, pets: false, luggage: "medium" as "small" | "medium" | "large" });
  const [womenOnly, setWomenOnly] = useState(false);
  const [busy, setBusy] = useState(false);

  const validStops = stops.filter((s): s is Place => !!s);
  useEffect(() => {
    if (!from || !to) return;
    api<Estimate>("/rides/estimate", { body: { origin: from, destination: to, stops: validStops, seats } })
      .then((e) => { setEst(e); setPrice(e.suggestedSeatPrice); }).catch(() => {});
  }, [from, to, seats, JSON.stringify(validStops)]);

  const publish = async () => {
    setBusy(true);
    try {
      await api("/rides", { body: { origin: from, destination: to, stops: validStops, departAt: when.toISOString(), seats, seatPrice: price, womenOnly, instantBook: true, rules } });
      Alert.alert("Ride published 🎉", "We'll notify you as soon as someone books a seat.");
      router.back();
    } catch (e) { Alert.alert("Couldn't publish", e instanceof ApiError ? e.message : "Try again"); }
    finally { setBusy(false); }
  };

  const step = (d: number) => est && setPrice((p) => Math.min(est.maxSeatPrice, Math.max(0, p + d)));

  return (
    <Screen>
      <Stagger index={0}><Card>
        <PlaceInput label="Leaving from" value={from} onChange={setFrom} placeholder="Shimla, Old Bus Stand" />
        {stops.map((s, i) => (
          <PlaceInput key={i} label={`Stop ${i + 1} (pick up / drop)`} value={s} onChange={(p) => setStops((all) => all.map((x, j) => (j === i ? p : x)))} placeholder="Solan" />
        ))}
        {stops.length < 3 && <Pressable onPress={() => setStops((s) => [...s, null])}><Text style={{ color: t.primary, fontWeight: "700" }}>+ Add a stop on the way</Text></Pressable>}
        <PlaceInput label="Going to" value={to} onChange={setTo} placeholder="Chandigarh, Sector 43 ISBT" />
      </Card></Stagger>

      <Card>
        <Row style={{ justifyContent: "space-between" }}>
          <Chip label={`📅 ${when.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}`} onPress={() => setPicker("date")} />
          <Chip label={`🕖 ${when.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`} onPress={() => setPicker("time")} />
        </Row>
        {picker && (
          <DateTimePicker value={when} mode={picker} minimumDate={new Date()} display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={(_, d) => { setPicker(Platform.OS === "ios" ? picker : null); if (d) setWhen(d); }} />
        )}
        <Row style={{ justifyContent: "space-between" }}>
          <P>Seats to offer</P>
          <Row><Chip label="−" onPress={() => setSeats((s) => Math.max(1, s - 1))} /><Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>{seats}</Text><Chip label="+" onPress={() => setSeats((s) => Math.min(6, s + 1))} /></Row>
        </Row>
      </Card>

      {est && from && to && (
        <Animated.View entering={ZoomIn.springify().damping(14)}><Card tinted>
          <Text style={{ fontSize: 11, letterSpacing: 1.5, fontWeight: "800", color: t.deep }}>
            {Math.round(est.route.distanceKm)} KM · {Math.floor(est.route.durationMin / 60)}H {est.route.durationMin % 60}M{est.route.tollsInr ? ` · ₹${est.route.tollsInr} TOLLS` : ""}{est.route.hillRoute ? " · HILL ROUTE" : ""}
          </Text>
          <P>Price per seat</P>
          <Row style={{ justifyContent: "center" }} gap={6}>
            <Chip label="−₹10" onPress={() => step(-10)} />
            <CountUp value={price} prefix="₹" duration={350} style={{ fontSize: 40, fontWeight: "900", color: t.deep }} />
            <Chip label="+₹10" onPress={() => step(10)} />
          </Row>
          <P small center>Suggested ₹{est.suggestedSeatPrice} · max ₹{est.maxSeatPrice} (cost-sharing limit)</P>
          <View style={{ backgroundColor: t.card, borderRadius: 12, padding: 12, gap: 4 }}>
            <P small muted>Bus fares on this route (approx.)</P>
            <P small>🚌 Volvo ₹{est.bus.volvo} · AC deluxe ₹{est.bus.acDeluxe} · Ordinary ₹{est.bus.ordinary}</P>
            <P small>💡 You recover ≈ ₹{price * seats} of your fuel and tolls with {seats} passengers.</P>
            <P small muted>⚠️ Bus fares, fuel and toll costs are estimates and not confirmed.</P>
          </View>
        </Card></Animated.View>
      )}

      <Card>
        <H level="h3">Ride rules</H>
        <Row style={{ justifyContent: "space-between" }}><P>Smoking allowed</P><Switch value={rules.smoking} onValueChange={(v) => setRules({ ...rules, smoking: v })} /></Row>
        <Row style={{ justifyContent: "space-between" }}><P>Pets allowed</P><Switch value={rules.pets} onValueChange={(v) => setRules({ ...rules, pets: v })} /></Row>
        <Row gap={2}>{(["small", "medium", "large"] as const).map((l) => <Chip key={l} label={`🧳 ${l}`} selected={rules.luggage === l} onPress={() => setRules({ ...rules, luggage: l })} />)}</Row>
        {user?.womenVerified && <Row style={{ justifyContent: "space-between" }}><P>Women passengers only</P><Switch value={womenOnly} onValueChange={setWomenOnly} /></Row>}
      </Card>

      <Button label="Publish ride" onPress={publish} loading={busy} disabled={!from || !to || !est} />
    </Screen>
  );
}
