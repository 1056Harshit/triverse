import { useState } from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Chip, H, P, Row, Screen, useTheme } from "@/components/ui";
import { PlaceInput, type Place } from "@/components/PlaceInput";
import { useAuth } from "@/lib/auth";
import { ServiceGate } from "@/components/ServiceGate";
import { AskFab } from "@/components/AskFab";
import { HeroScene } from "@/components/motion/HeroScene";
import { Stagger } from "@/components/motion/Stagger";

const dayISO = (offset: number) => {
  const d = new Date(Date.now() + offset * 86_400_000);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
};

export default function RideScreen() {
  return <ServiceGate service="ride"><View style={{ flex: 1 }}><Ride /><AskFab /></View></ServiceGate>;
}

function Ride() {
  const t = useTheme();
  const { user } = useAuth();
  const [from, setFrom] = useState<Place | null>(null);
  const [to, setTo] = useState<Place | null>(null);
  const [day, setDay] = useState(0);
  const [seats, setSeats] = useState(1);
  const [womenOnly, setWomenOnly] = useState(false);
  const [dayLabels] = useState(() => ["Today", "Tomorrow", new Date(Date.now() + 2 * 86_400_000).toLocaleDateString("en-IN", { weekday: "short", day: "numeric" })]);

  const search = () => router.push({ pathname: "/ride/results", params: {
    from: JSON.stringify(from), to: JSON.stringify(to), date: dayISO(day), seats: String(seats), womenOnly: womenOnly ? "1" : "0",
  } });

  const offer = () => router.push(user?.kyc.driver === "verified" ? "/ride/offer" : "/ride/verify");

  return (
    <Screen fab>
      <HeroScene service="ride" title="Where to?" subtitle="Verified people · fair prices · safe rides" />
      <Stagger index={0}><Card>
        <PlaceInput label="From" value={from} onChange={setFrom} placeholder="Shimla" />
        <Pressable onPress={() => { setFrom(to); setTo(from); }} style={{ alignSelf: "flex-end", marginTop: -6 }}><Text style={{ fontSize: 20, color: t.primary }}>⇅</Text></Pressable>
        <PlaceInput label="To" value={to} onChange={setTo} placeholder="Chandigarh" />
        <Row gap={2} style={{ flexWrap: "wrap" }}>
          {dayLabels.map((l, i) => <Chip key={l} label={l} selected={day === i} onPress={() => setDay(i)} />)}
        </Row>
        <Row style={{ justifyContent: "space-between" }}>
          <P>Seats</P>
          <Row>
            <Chip label="−" onPress={() => setSeats((s) => Math.max(1, s - 1))} />
            <Text style={{ fontSize: 18, fontWeight: "800", color: t.text, minWidth: 20, textAlign: "center" }}>{seats}</Text>
            <Chip label="+" onPress={() => setSeats((s) => Math.min(6, s + 1))} />
          </Row>
        </Row>
        {user?.womenVerified && (
          <Row style={{ justifyContent: "space-between" }}><P>Women-only rides</P><Switch value={womenOnly} onValueChange={setWomenOnly} trackColor={{ true: t.primary }} /></Row>
        )}
        <Button label="Search rides" onPress={search} disabled={!from || !to} />
      </Card></Stagger>

      <Stagger index={1}><Card tinted onPress={offer} style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <Text style={{ fontSize: 40 }}>🚗</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 17, fontWeight: "800", color: t.deep }}>Driving somewhere?</Text>
          <Text style={{ color: t.deep, opacity: 0.85 }}>Offer your empty seats and split fuel and tolls.{user?.kyc.driver !== "verified" ? " Verify once to start." : ""}</Text>
        </View>
      </Card></Stagger>

      <Stagger index={2}><Card onPress={() => router.push({ pathname: "/chat/[agent]", params: { agent: "ride" } })}>
        <H level="h3">💬 Ask Safar Saathi</H>
        <P muted small>"What's a fair price Shimla to Delhi?" · "Find me a ride to Manali on Saturday"</P>
      </Card></Stagger>

      <Stagger index={3}><Card>
        <H level="h3">Why it's safer here</H>
        <P small>✓ Every driver's licence, RC, insurance and face are verified against government records</P>
        <P small>✓ Pay in the app; the driver gets paid only after your trip</P>
        <P small>✓ Live trip sharing, SOS and a ride PIN for every booking</P>
        <P small>✓ Prices are capped at a fair cost-share; no surge, ever</P>
      </Card></Stagger>
    </Screen>
  );
}
