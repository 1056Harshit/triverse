import * as React from "react";
import { Column, Img, Row, Section, Text } from "react-email";
import { SERVICES, type ServiceId } from "@triverse/shared";
import { CTA, Layout } from "../src/components/Layout.tsx";
import { APP_URL, ASSET_BASE, greeting } from "../src/theme.ts";

export interface JoinedEmailProps { name?: string; sentAt?: Date }

const BLURB: Record<ServiceId, [string, string]> = {
  farm: ["🌾", "Photo crop diagnosis, safe pesticides, mandi prices"],
  ride: ["🚗", "Verified shared rides at a fair cost-share price"],
  dine: ["🍽", "The best places to eat and stay near you"],
  health: ["🩺", "Hospitals near you, medicine reminders, 108 in one tap"],
  travel: ["🏔", "Day-by-day trip plans, sights and weather"],
};

/** Sent the first time someone signs in: introduces every world and the voice assistant. */
export default function JoinedEmail({ name, sentAt }: JoinedEmailProps) {
  const first = name?.split(" ")[0];
  return (
    <Layout preview={`Welcome to PvtFrnd${first ? `, ${first}` : ""}! Five worlds, one friendly app.`}>
      <Section style={{ backgroundColor: "#EEF3FF", padding: "40px 32px 28px", textAlign: "center" }}>
        <Text className="tv-float" style={{ fontSize: 54, margin: 0, lineHeight: "60px" }}>🎉</Text>
        <Text style={{ fontSize: 14, color: "#1E3A8A", fontWeight: 600, letterSpacing: 1.5, margin: "12px 0 6px" }}>
          {greeting(sentAt).toUpperCase()}{first ? `, ${first.toUpperCase()}` : ""} 👋
        </Text>
        <Text style={{ fontSize: 28, lineHeight: "36px", color: "#0F172A", fontWeight: 700, margin: "0 0 10px" }}>Welcome to PvtFrnd</Text>
        <Text style={{ fontSize: 16, lineHeight: "24px", color: "#334155", margin: "0 auto 24px", maxWidth: 440 }}>
          One app for your farm, your rides, your meals, your health and your trips, with a friendly AI helper in each.
        </Text>
        <CTA href={`${APP_URL}/open`} label="Open PvtFrnd" color="#2F6FEB" />
      </Section>

      <Section className="tv-pad" style={{ padding: "26px 32px 6px" }}>
        {(Object.keys(SERVICES) as ServiceId[]).map((s) => (
          <Section key={s} style={{ backgroundColor: SERVICES[s].tint, borderRadius: 16, padding: "12px 14px", marginBottom: 10 }}>
            <Row>
              <Column style={{ width: 46 }}><Text style={{ fontSize: 26, margin: 0 }}>{BLURB[s][0]}</Text></Column>
              <Column>
                <Text style={{ margin: 0, fontSize: 15, fontWeight: 700, color: SERVICES[s].deep }}>{SERVICES[s].name} · {SERVICES[s].agentName}</Text>
                <Text style={{ margin: 0, fontSize: 13, color: "#475569" }}>{BLURB[s][1]}</Text>
              </Column>
            </Row>
          </Section>
        ))}
      </Section>

      <Section style={{ padding: "8px 32px 34px" }}>
        <Section style={{ backgroundColor: "#0F172A", borderRadius: 16, padding: "18px 22px" }}>
          <Row>
            <Column style={{ width: 52 }}><Img src={`${ASSET_BASE}/email-mark.png`} width={36} height={45} alt="" /></Column>
            <Column>
              <Text style={{ margin: 0, fontSize: 16, color: "#FFFFFF", fontWeight: 700 }}>🎤 Just say it: "Ask Frnd"</Text>
              <Text style={{ margin: "4px 0 0", fontSize: 13, lineHeight: "20px", color: "#CBD5E1" }}>
                Tap the mic button and speak in Hindi, Punjabi or English. PvtFrnd figures out the rest.
              </Text>
            </Column>
          </Row>
        </Section>
      </Section>
    </Layout>
  );
}
