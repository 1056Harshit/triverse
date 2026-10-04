import * as React from "react";
import { Column, Img, Row, Section, Text } from "react-email";
import { CTA, Layout } from "../src/components/Layout.tsx";
import { accent, APP_URL } from "../src/theme.ts";

export interface RideBookedEmailProps {
  role: "passenger" | "driver";
  bookingId: string;
  otherParty: { name: string; avatarUrl?: string; rating: number; verified: boolean };
  from: string;
  to: string;
  pickup: string;
  departAt: string;
  seats: number;
  seatPrice: number;
  busEstimate: number;
  vehicle?: string;
}

export default function RideBookedEmail({
  role = "passenger", bookingId = "TV-8K2Q", from = "Shimla", to = "Chandigarh", pickup = "Tutikandi ISBT gate 2",
  departAt = "Sat, 4 Oct · 7:30 AM", seats = 1, seatPrice = 280, busEstimate = 445, vehicle = "White Maruti Dzire · HP 03 •• 21",
  otherParty = { name: "Rohit Sharma", rating: 4.9, verified: true },
}: RideBookedEmailProps) {
  const a = accent("ride");
  const saved = Math.max(0, (busEstimate - seatPrice) * seats);
  const title = role === "passenger" ? "Your seat is confirmed 🎉" : "New booking on your ride 🚗";
  return (
    <Layout preview={`${from} → ${to} · ${departAt} · booking ${bookingId}`} accentKey="ride">
      <Section style={{ backgroundColor: a.tint, padding: "32px 32px 24px" }}>
        <Text style={{ margin: 0, fontSize: 12, letterSpacing: 2, color: a.deep, fontWeight: 600 }}>BOOKING {bookingId}</Text>
        <Text style={{ margin: "6px 0 18px", fontSize: 26, fontWeight: 700, color: "#0F172A" }}>{title}</Text>
        {/* Route ticket */}
        <Section style={{ backgroundColor: "#FFFFFF", borderRadius: 18, padding: "18px 20px", border: "1px dashed #93B4F5" }}>
          <Row>
            <Column style={{ width: "42%" }}>
              <Text style={{ margin: 0, fontSize: 11, color: "#64748B" }}>FROM</Text>
              <Text style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0F172A" }}>{from}</Text>
            </Column>
            <Column align="center" style={{ width: "16%" }}>
              <Text style={{ margin: 0, fontSize: 20, color: a.primary }}>●━━➤</Text>
            </Column>
            <Column align="right" style={{ width: "42%" }}>
              <Text style={{ margin: 0, fontSize: 11, color: "#64748B" }}>TO</Text>
              <Text style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0F172A" }}>{to}</Text>
            </Column>
          </Row>
          <Text style={{ margin: "12px 0 0", fontSize: 14, color: "#334155" }}>🕖 {departAt}  ·  📍 {pickup}</Text>
          {vehicle && <Text style={{ margin: "4px 0 0", fontSize: 14, color: "#334155" }}>🚘 {vehicle}</Text>}
        </Section>
      </Section>

      <Section className="tv-pad" style={{ padding: "24px 32px 8px" }}>
        <Row>
          <Column style={{ width: 64 }}>
            {otherParty.avatarUrl
              ? <Img src={otherParty.avatarUrl} width={52} height={52} alt="" style={{ borderRadius: 26 }} />
              : <span style={{ display: "inline-block", width: 52, height: 52, lineHeight: "52px", borderRadius: 26, textAlign: "center", backgroundColor: a.primary, color: "#fff", fontSize: 20, fontWeight: 700 }}>{otherParty.name[0]}</span>}
          </Column>
          <Column>
            <Text style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0F172A" }}>
              {otherParty.name} {otherParty.verified && <span style={{ fontSize: 12, color: "#15803D", backgroundColor: "#DCFCE7", borderRadius: 999, padding: "2px 8px", marginLeft: 6 }}>✔ ID verified</span>}
            </Text>
            <Text style={{ margin: 0, fontSize: 13, color: "#64748B" }}>⭐ {otherParty.rating.toFixed(1)} · {role === "passenger" ? "your driver" : "your passenger"}</Text>
          </Column>
        </Row>
      </Section>

      <Section className="tv-pad" style={{ padding: "12px 32px" }}>
        <Row>
          <Column style={{ width: "50%", padding: 4 }}>
            <Section style={{ backgroundColor: "#F8FAFC", borderRadius: 14, padding: "14px 16px" }}>
              <Text style={{ margin: 0, fontSize: 12, color: "#64748B" }}>{seats} seat{seats > 1 ? "s" : ""} · cost share</Text>
              <Text style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#0F172A" }}>₹{seatPrice * seats}</Text>
              <Text style={{ margin: 0, fontSize: 11, color: "#64748B" }}>Held safely, released after the trip</Text>
            </Section>
          </Column>
          <Column style={{ width: "50%", padding: 4 }}>
            <Section style={{ backgroundColor: "#ECFDF5", borderRadius: 14, padding: "14px 16px" }}>
              <Text style={{ margin: 0, fontSize: 12, color: "#047857" }}>vs Volvo ≈ ₹{busEstimate * seats}</Text>
              <Text style={{ margin: 0, fontSize: 24, fontWeight: 700, color: "#047857" }}>₹{saved} saved</Text>
              <Text style={{ margin: 0, fontSize: 11, color: "#047857" }}>Bus fare is an estimate</Text>
            </Section>
          </Column>
        </Row>
      </Section>

      <Section className="tv-pad" style={{ padding: "8px 32px 8px" }}>
        <Text style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", margin: "0 0 6px" }}>Ride safe with TriVerse</Text>
        <Text style={{ fontSize: 13, lineHeight: "21px", color: "#475569", margin: 0 }}>
          📡 Share your live trip with family in one tap<br />
          🆘 SOS button connects to 112 and our safety desk<br />
          💬 Chat and call only inside the app; your number stays private<br />
          🔢 Share your 4-digit ride PIN only when you're in the car
        </Text>
      </Section>
      <Section style={{ padding: "20px 32px 36px", textAlign: "center" }}>
        <CTA href={`${APP_URL}/ride/booking/${bookingId}`} label="View trip" color={a.primary} />
      </Section>
    </Layout>
  );
}
