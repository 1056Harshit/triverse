import { Image, Linking, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import type { AgentCard, Facility, RideSummary } from "@triverse/shared";
import { Badge, Card, Row, useTheme } from "../ui";

export function AgentCardView({ card }: { card: AgentCard }) {
  switch (card.kind) {
    case "ride": return <RideCard ride={card.ride} />;
    case "product": return <ProductCard {...card} />;
    case "diagnosis": return <DiagnosisCard {...card} />;
    case "place": return <PlaceMini {...card} />;
    case "poster": return <PosterCard {...card} />;
    case "facility": return <FacilityCard f={card.facility} />;
    case "plan": return <PlanCard {...card} />;
  }
}

export function RideCard({ ride }: { ride: RideSummary }) {
  const t = useTheme();
  const time = new Date(ride.departAt).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  const saved = ride.busEstimate - ride.seatPrice;
  return (
    <Card onPress={() => router.push({ pathname: "/ride/[id]", params: { id: ride.id, data: JSON.stringify(ride) } })}>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: t.text }}>{time}</Text>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: t.deep }}>₹{ride.seatPrice}</Text>
          {saved > 0 && <Text style={{ fontSize: 12, color: t.success, fontWeight: "700" }}>≈ ₹{saved} less than Volvo*</Text>}
        </View>
      </Row>
      <Row gap={2}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.primary }} />
        <Text style={{ color: t.text, fontWeight: "600" }}>{ride.origin.name}</Text>
        <Text style={{ color: t.subtle }}>━━</Text>
        <Text style={{ color: t.text, fontWeight: "600" }}>{ride.destination.name}</Text>
      </Row>
      {ride.stops.length > 0 && <Text style={{ fontSize: 12, color: t.muted }}>via {ride.stops.map((s) => s.name).join(", ")}</Text>}
      <Row style={{ justifyContent: "space-between" }}>
        <Row gap={2}>
          {ride.driver.avatarUrl ? <Image source={{ uri: ride.driver.avatarUrl }} style={{ width: 32, height: 32, borderRadius: 16 }} /> : <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: t.tint }} />}
          <View>
            <Text style={{ color: t.text, fontWeight: "700" }}>{ride.driver.name}</Text>
            <Text style={{ color: t.muted, fontSize: 12 }}>★ {ride.driver.rating || "New"} · {ride.driver.trips} trips</Text>
          </View>
        </Row>
        <Text style={{ color: t.muted, fontSize: 13 }}>{ride.seatsLeft} seat{ride.seatsLeft > 1 ? "s" : ""} left</Text>
      </Row>
      <Row gap={1.5} style={{ flexWrap: "wrap" }}>
        {ride.driver.badges.map((b) => <Badge key={b} label={`✓ ${b}`} tone="success" />)}
        {ride.womenOnly && <Badge label="Women only" />}
        {ride.instantBook && <Badge label="⚡ Instant" tone="muted" />}
      </Row>
    </Card>
  );
}

function ProductCard({ title, price, seller, url, registered }: Extract<AgentCard, { kind: "product" }>) {
  const t = useTheme();
  return (
    <Card onPress={() => Linking.openURL(url)}>
      <Row style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
        <Text style={{ flex: 1, color: t.text, fontWeight: "700" }} numberOfLines={2}>{title}</Text>
        <Text style={{ color: t.deep, fontWeight: "800", fontSize: 16 }}>{price}</Text>
      </Row>
      <Row style={{ justifyContent: "space-between" }}>
        <Text style={{ color: t.muted, fontSize: 13 }}>{seller} ↗</Text>
        <Badge label={registered ? "CIB&RC registered" : "Check registration"} tone={registered ? "success" : "warning"} />
      </Row>
      <Text style={{ fontSize: 11, color: t.muted }}>⚠️ Price not confirmed; it may change on the seller's site.</Text>
    </Card>
  );
}

function DiagnosisCard({ disease, confidence, crop }: Extract<AgentCard, { kind: "diagnosis" }>) {
  const t = useTheme();
  const tone = confidence === "high" ? "success" : confidence === "medium" ? "accent" : "warning";
  return (
    <Card tinted>
      <Text style={{ fontSize: 11, letterSpacing: 1.5, color: t.deep, fontWeight: "800" }}>DIAGNOSIS · {crop.toUpperCase()}</Text>
      <Text style={{ fontSize: 20, fontWeight: "800", color: t.text }}>{disease}</Text>
      <Badge label={`${confidence} confidence`} tone={tone} />
    </Card>
  );
}

export function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const t = useTheme();
  if (!score) {
    // OpenStreetMap places have no ratings: show a neutral ring rather than a misleading 0.0.
    return (
      <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: t.border, borderStyle: "dashed", alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: size * 0.22, fontWeight: "700", color: t.muted, textAlign: "center" }}>no{"\n"}rating</Text>
      </View>
    );
  }
  const color = score >= 4.5 ? "#16A34A" : score >= 4 ? t.primary : score >= 3.5 ? "#D97706" : "#DC2626";
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 4, borderColor: color, alignItems: "center", justifyContent: "center", backgroundColor: t.card }}>
      <Text style={{ fontSize: size * 0.32, fontWeight: "800", color }}>{score.toFixed(1)}</Text>
    </View>
  );
}

function PlaceMini({ name, score, reviews, url }: Extract<AgentCard, { kind: "place" }>) {
  const t = useTheme();
  return (
    <Card onPress={url ? () => Linking.openURL(url) : undefined}>
      <Row>
        <ScoreRing score={score} size={44} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: t.text, fontWeight: "700" }}>{name}</Text>
          <Text style={{ color: t.muted, fontSize: 12 }}>TriScore · {reviews.toLocaleString("en-IN")} reviews</Text>
        </View>
      </Row>
    </Card>
  );
}

function PosterCard({ url, headline }: Extract<AgentCard, { kind: "poster" }>) {
  const t = useTheme();
  return (
    <Pressable onPress={() => Linking.openURL(url)} style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: t.border }}>
      <Image source={{ uri: url }} style={{ width: "100%", aspectRatio: 4 / 5 }} resizeMode="cover" />
      <Text style={{ padding: 10, color: t.text, fontWeight: "600" }}>{headline}</Text>
    </Pressable>
  );
}

const FACILITY_EMOJI: Record<string, string> = { Hospital: "🏥", Clinic: "🩺", Doctor: "👨‍⚕️", Pharmacy: "💊", Temple: "🛕", Monastery: "☸️", Gurdwara: "🪯", Church: "⛪", Mosque: "🕌", Viewpoint: "🏔", Museum: "🏛", Heritage: "🏰", Hotel: "🏨", "Guest house": "🏡", Hostel: "🛏" };

/** Opens the shared place-detail screen for a hospital, sight or stay. */
export function openFacility(f: Facility, service: "health" | "travel" | "dine" = "health") {
  router.push({ pathname: "/place/[id]", params: { id: f.id, service, data: JSON.stringify({
    id: f.id, name: f.name, address: f.address, location: f.location, distanceKm: f.distanceKm, photoUrl: f.photoUrl,
    triScore: f.rating ?? 0, sources: f.rating ? [{ source: "google", rating: f.rating, reviews: 0 }] : [], highlights: [f.category],
    phone: f.phone, website: f.website ?? f.wikipedia,
  }) } });
}

const directionsTo = (f: Facility) =>
  Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${f.location.lat},${f.location.lng}${f.id.startsWith("g:") ? `&destination_place_id=${encodeURIComponent(f.id.slice(2))}` : ""}`);

export function FacilityCard({ f, service = "health" }: { f: Facility; service?: "health" | "travel" | "dine" }) {
  const t = useTheme();
  const site = f.website ?? f.wikipedia;
  return (
    <Card onPress={() => openFacility(f, service)}>
      <Row style={{ alignItems: "flex-start" }}>
        {f.photoUrl
          ? <Image source={{ uri: f.photoUrl }} style={{ width: 56, height: 56, borderRadius: 14 }} />
          : <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: t.tint, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 26 }}>{FACILITY_EMOJI[f.category] ?? "📍"}</Text></View>}
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ color: t.text, fontWeight: "800", fontSize: 16 }} numberOfLines={2}>{f.name}</Text>
          <Text style={{ color: t.muted, fontSize: 12 }}>{f.category} · {f.distanceKm} km{f.rating ? ` · ★ ${f.rating}` : ""}</Text>
          <Row gap={1.5} style={{ flexWrap: "wrap" }}>
            {f.emergency && <Badge label="🚑 Emergency" tone="warning" />}
            {f.open24x7 && <Badge label="24×7" tone="success" />}
            {f.ownership === "government" && <Badge label="Govt" tone="accent" />}
            {f.ownership === "private" && <Badge label="Private" tone="muted" />}
          </Row>
        </View>
      </Row>
      <Row gap={2}>
        {f.phone && <MiniBtn label="📞 Call" onPress={() => Linking.openURL(`tel:${f.phone!.split(/[;,]/)[0].trim()}`)} />}
        {site && <MiniBtn label={f.website ? "🌐 Website" : "📖 Wikipedia"} onPress={() => Linking.openURL(site)} />}
        <MiniBtn label="🧭 Directions" onPress={() => directionsTo(f)} />
      </Row>
    </Card>
  );
}

function MiniBtn({ label, onPress }: { label: string; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flex: 1, paddingVertical: 9, borderRadius: 999, alignItems: "center", backgroundColor: t.tint, opacity: pressed ? 0.75 : 1 })}>
      <Text style={{ color: t.deep, fontWeight: "700", fontSize: 13 }}>{label}</Text>
    </Pressable>
  );
}

function PlanCard({ title, items, total }: Extract<AgentCard, { kind: "plan" }>) {
  const t = useTheme();
  return (
    <Card tinted>
      <Text style={{ fontSize: 11, letterSpacing: 1.5, fontWeight: "800", color: t.deep }}>YOUR PLAN</Text>
      <Text style={{ fontSize: 19, fontWeight: "800", color: t.text }}>{title}</Text>
      {items.map((it, i) => (
        <Row key={i} style={{ alignItems: "flex-start" }}>
          <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: t.primary, alignItems: "center", justifyContent: "center", marginTop: 2 }}><Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>{i + 1}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontWeight: "700" }}>{it.label}</Text>
            <Text style={{ color: t.muted, fontSize: 13 }}>{it.detail}</Text>
          </View>
          {it.cost !== undefined && <Text style={{ color: t.deep, fontWeight: "800" }}>₹{it.cost.toLocaleString("en-IN")}</Text>}
        </Row>
      ))}
      {total !== undefined && (
        <Row style={{ justifyContent: "space-between", borderTopWidth: 1, borderColor: t.border, paddingTop: 10 }}>
          <Text style={{ color: t.text, fontWeight: "800" }}>Total per person</Text>
          <Text style={{ color: t.deep, fontWeight: "900", fontSize: 18 }}>₹{total.toLocaleString("en-IN")}</Text>
        </Row>
      )}
      <Text style={{ fontSize: 11, color: t.muted, marginTop: 4 }}>⚠️ Prices are estimates and not confirmed. Please check before paying.</Text>
    </Card>
  );
}
