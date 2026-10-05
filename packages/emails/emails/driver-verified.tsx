import * as React from "react";
import { Row, Column, Section, Text } from "react-email";
import { CTA, Layout } from "../src/components/Layout.tsx";
import { accent, APP_URL } from "../src/theme.ts";

export interface DriverVerifiedEmailProps {
  name: string;
  status: "verified" | "rejected";
  checks: Array<{ label: string; ok: boolean; note?: string }>;
}

export default function DriverVerifiedEmail({
  name = "Rohit", status = "verified",
  checks = [
    { label: "Driving licence (Sarathi)", ok: true },
    { label: "Vehicle RC (Vahan)", ok: true },
    { label: "Insurance valid till Mar 2027", ok: true },
    { label: "Selfie face-match", ok: true },
  ],
}: DriverVerifiedEmailProps) {
  const a = accent("ride");
  const ok = status === "verified";
  return (
    <Layout preview={ok ? "You're a verified PvtFrnd driver" : "Action needed on your driver verification"} accentKey="ride">
      <Section style={{ backgroundColor: ok ? "#ECFDF5" : "#FEF2F2", padding: "36px 32px", textAlign: "center" }}>
        <Text className="tv-pop" style={{ fontSize: 54, margin: 0 }}>{ok ? "🏅" : "📄"}</Text>
        <Text style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: "8px 0 6px" }}>
          {ok ? `You're verified, ${name}!` : `${name}, one more thing`}
        </Text>
        <Text style={{ fontSize: 15, color: "#334155", margin: 0 }}>
          {ok ? "Your Verified Driver badge is live. Passengers can now book your rides." : "We couldn't confirm everything. Fix the item below and resubmit; it takes 2 minutes."}
        </Text>
      </Section>
      <Section className="tv-pad" style={{ padding: "24px 40px" }}>
        {checks.map((c) => (
          <Row key={c.label} style={{ borderBottom: "1px solid #F1F5F9" }}>
            <Column style={{ width: 32 }}><Text style={{ margin: "10px 0", fontSize: 18 }}>{c.ok ? "✅" : "⚠️"}</Text></Column>
            <Column>
              <Text style={{ margin: "10px 0 0", fontSize: 14, color: "#0F172A" }}>{c.label}</Text>
              {c.note && <Text style={{ margin: "0 0 10px", fontSize: 12, color: "#B91C1C" }}>{c.note}</Text>}
            </Column>
          </Row>
        ))}
      </Section>
      <Section style={{ padding: "0 32px 36px", textAlign: "center" }}>
        <CTA href={`${APP_URL}/ride/${ok ? "offer" : "verify"}`} label={ok ? "Offer your first ride" : "Fix and resubmit"} color={a.primary} />
      </Section>
    </Layout>
  );
}
