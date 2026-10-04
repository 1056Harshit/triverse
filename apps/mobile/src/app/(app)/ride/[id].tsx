import { useState } from "react";
import { Alert, Image, Linking, Share, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { RouteMap } from "@/components/RouteMap";
import * as Location from "expo-location";
import type { RideSummary } from "@triverse/shared";
import { Badge, Button, Card, Chip, H, P, Row, Screen, useTheme } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { authorisePayment } from "@/lib/payments";
import Animated, { FlipInXUp, ZoomIn } from "react-native-reanimated";
import { Confetti } from "@/components/motion/Extras";

export default function RideDetail() {
  const t = useTheme();
  const { data } = useLocalSearchParams<{ id: string; data: string }>();
  const ride = JSON.parse(data) as RideSummary;
  const [seats, setSeats] = useState(1);
  const [busy, setBusy] = useState(false);
  const [booked, setBooked] = useState<{ bookingId: string; code: string; pin: string } | null>(null);

  const points = [ride.origin, ...ride.stops, ride.destination];
  const depart = new Date(ride.departAt);

  const book = async () => {
    setBusy(true);
    try {
      const b = await api<{ bookingId: string; code: string; amount: number; payment: { orderId: string; keyId?: string } }>(`/rides/${ride.id}/book`, { body: { seats } });
      const pay = await authorisePayment(b.payment, b.amount);
      const c = await api<{ ridePin: string }>(`/bookings/${b.bookingId}/confirm-payment`, { body: pay });
      setBooked({ bookingId: b.bookingId, code: b.code, pin: c.ridePin });
    } catch (e) {
      if (e instanceof ApiError && e.code === "identity_kyc_required") {
        Alert.alert("Verify your ID", e.message, [{ text: "Later" }, { text: "Verify now", onPress: () => api<{ url?: string }>("/kyc/identity/start", { body: {} }).then((r) => r.url && Linking.openURL(r.url)) }]);
      } else if (e instanceof ApiError && e.code === "photo_required") {
        Alert.alert("Add a photo", e.message, [{ text: "OK", onPress: () => router.push("/profile") }]);
      } else Alert.alert("Couldn't book", e instanceof Error ? e.message : "Try again");
    } finally { setBusy(false); }
  };

  const sos = async () => {
    if (!booked) return;
    const pos = await Location.getCurrentPositionAsync({}).catch(() => null);
    await api(`/trips/${booked.bookingId}/sos`, { body: { lat: pos?.coords.latitude ?? 0, lng: pos?.coords.longitude ?? 0 } }).catch(() => {});
    Linking.openURL("tel:112");
  };

  return (
    <Screen padded={false}>
      <RouteMap points={points} color={t.primary} />

      <View style={{ padding: 16, gap: 16 }}>
        <View>
          <H>{ride.origin.name} → {ride.destination.name}</H>
          <P muted>{depart.toLocaleString("en-IN", { weekday: "long", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })} · {Math.round(ride.distanceKm)} km</P>
        </View>

        <Row>
          <Card style={{ flex: 1 }}><P small muted>Per seat</P><Text style={{ fontSize: 26, fontWeight: "800", color: t.deep }}>₹{ride.seatPrice}</Text><P small muted>fair cost-share</P></Card>
          <Card style={{ flex: 1 }}><P small muted>Volvo bus ≈</P><Text style={{ fontSize: 26, fontWeight: "800", color: t.muted, textDecorationLine: "line-through" }}>₹{ride.busEstimate}</Text><P small muted>estimate</P></Card>
        </Row>
        <P small muted>⚠️ Bus fares are estimates and not confirmed. The seat price is set by the driver within TriVerse's cost-share limit.</P>

        <Card>
          <Row>
            {ride.driver.avatarUrl ? <Image source={{ uri: ride.driver.avatarUrl }} style={{ width: 56, height: 56, borderRadius: 28 }} /> : null}
            <View style={{ flex: 1 }}>
              <H level="h3">{ride.driver.name}</H>
              <P small muted>★ {ride.driver.rating || "New"} · {ride.driver.trips} verified trips</P>
            </View>
          </Row>
          <Row gap={1.5} style={{ flexWrap: "wrap" }}>{ride.driver.badges.map((b) => <Badge key={b} label={`✓ ${b}`} tone="success" />)}</Row>
          <P small>{ride.rules.smoking ? "🚬 Smoking OK" : "🚭 No smoking"} · {ride.rules.pets ? "🐕 Pets OK" : "No pets"} · 🧳 {ride.rules.luggage} luggage</P>
          {ride.stops.length > 0 && <P small>📍 Stops: {ride.stops.map((s) => s.name).join(" → ")}</P>}
        </Card>

        {booked ? (
          <Animated.View entering={ZoomIn.springify().damping(12)}>
          {<Confetti count={28} />}
          <Card tinted>
            <Text style={{ fontSize: 11, letterSpacing: 1.5, fontWeight: "800", color: t.deep }}>BOOKING {booked.code}</Text>
            <H>You're booked 🎉</H>
            <P>Your ride PIN</P>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {booked.pin.split("").map((d, i) => (
                <Animated.View key={i} entering={FlipInXUp.delay(250 + i * 120)} style={{ width: 52, height: 64, borderRadius: 14, backgroundColor: t.card, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: t.primary }}>
                  <Text style={{ fontSize: 34, fontWeight: "900", color: t.deep }}>{d}</Text>
                </Animated.View>
              ))}
            </View>
            <P small>Tell this PIN to the driver only after you've checked their face and number plate and are seated.</P>
            <Row>
              <Button style={{ flex: 1 }} label="Share trip" variant="secondary" onPress={() => Share.share({ message: `I'm riding ${ride.origin.name} → ${ride.destination.name} with ${ride.driver.name} on TriVerse (booking ${booked.code}). Track: https://pvtfrnd.com/t/${booked.code}` })} />
              <Button style={{ flex: 1 }} label="SOS" variant="danger" onPress={sos} />
            </Row>
          </Card>
          </Animated.View>
        ) : (
          <>
            <Row style={{ justifyContent: "space-between" }}>
              <P>Seats ({ride.seatsLeft} left)</P>
              <Row>
                <Chip label="−" onPress={() => setSeats((s) => Math.max(1, s - 1))} />
                <Text style={{ fontSize: 18, fontWeight: "800", color: t.text }}>{seats}</Text>
                <Chip label="+" onPress={() => setSeats((s) => Math.min(ride.seatsLeft, s + 1))} />
              </Row>
            </Row>
            <Button label={`Book ${seats} seat${seats > 1 ? "s" : ""} · ₹${ride.seatPrice * seats}`} onPress={book} loading={busy} />
            <P small muted center>Money is held securely and released to the driver after the trip. Free cancellation until 24 hours before.</P>
          </>
        )}
      </View>
    </Screen>
  );
}
