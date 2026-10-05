import * as React from "react";
import { Column, Img, Row, Section, Text } from "react-email";
import { SERVICES, type ServiceId } from "@triverse/shared";
import { CTA, Layout } from "../src/components/Layout.tsx";
import { accent, APP_URL, ASSET_BASE, greeting } from "../src/theme.ts";

export interface WelcomeEmailProps {
  name: string;
  service: ServiceId;
  city?: string;
  /** Optional live snippet, e.g. weather tip, a popular route or a top-rated place nearby. */
  spotlight?: { title: string; body: string };
  sentAt?: Date;
}

const COPY: Record<ServiceId, {
  emoji: string; headline: string; sub: string; cta: string;
  features: Array<[string, string, string]>; steps: string[];
}> = {
  farm: {
    emoji: "🌾",
    headline: "Your farm just got a smart friend",
    sub: "Snap a photo of any leaf and Farm Frnd tells you what's wrong, and exactly what to do next.",
    cta: "Scan my first crop",
    features: [
      ["📸", "Photo diagnosis", "Disease, pest or deficiency, identified in seconds"],
      ["🧪", "Safe input finder", "Only registered pesticides, best online prices"],
      ["🌦", "Weather-wise tips", "Spray windows and sowing alerts for your village"],
    ],
    steps: ["Add your crops", "Set your village", "Scan a leaf"],
  },
  ride: {
    emoji: "🚗",
    headline: "Every seat, verified. Every ride, fair.",
    sub: "Share rides with ID-checked people and split the cost. Always cheaper than the Volvo, never a profit grab.",
    cta: "Find a ride",
    features: [
      ["🪪", "Verified drivers", "DL, RC and face-match checked for every driver"],
      ["💸", "Fair cost-share", "AI-suggested seat price shown next to the bus fare"],
      ["🆘", "Live safety", "Trip sharing, SOS and women-only rides"],
    ],
    steps: ["Verify your ID", "Add a photo", "Book or offer a seat"],
  },
  dine: {
    emoji: "🍽",
    headline: "Never eat a bad meal again",
    sub: "Dine Frnd blends ratings from multiple sites into one honest TriScore, so you always know where to go.",
    cta: "Explore nearby",
    features: [
      ["⭐", "TriScore", "One trusted score from many review sources"],
      ["📍", "Near you", "Restaurants and stays ranked by distance and quality"],
      ["🧠", "Ask anything", "\"Veg thali under ₹300 with parking?\" Just ask."],
    ],
    steps: ["Allow location", "Pick your tastes", "Save favourites"],
  },
  health: {
    emoji: "🩺",
    headline: "Care that's always close by",
    sub: "Health Frnd finds the nearest hospital, explains your reports in simple words, and reminds you to take your medicines.",
    cta: "Find care near me",
    features: [
      ["🏥", "Hospitals nearby", "Government and private, with call, website and directions"],
      ["💊", "Medicine reminders", "Never miss a dose; family can help too"],
      ["🆘", "One-tap emergency", "108 ambulance and 112 always one tap away"],
    ],
    steps: ["Allow location", "Add your medicines", "Save your nearest hospital"],
  },
  travel: {
    emoji: "🏔",
    headline: "Your next trip, planned in a minute",
    sub: "Travel Frnd plans routes, stays, food and sights, checks the weather, and adds it all up into one budget.",
    cta: "Plan a trip",
    features: [
      ["🗺", "Day-by-day plans", "Routes, timings and costs in one place"],
      ["📸", "Sights near you", "Viewpoints, temples and museums with photos and links"],
      ["🌦", "Weather-wise", "Know before you go: rain, snow and road cautions"],
    ],
    steps: ["Pick a destination", "Choose your dates", "Share the plan with family"],
  },
};

export default function WelcomeEmail({ name = "Harshit", service = "farm", city = "Shimla", spotlight, sentAt }: WelcomeEmailProps) {
  const a = accent(service);
  const c = COPY[service];
  const svc = SERVICES[service];
  const others = (Object.keys(SERVICES) as ServiceId[]).filter((s) => s !== service);
  const first = name.split(" ")[0];

  return (
    <Layout preview={`${greeting(sentAt)}, ${first}! ${c.headline}`} accentKey={service} marketing={false}>
      {/* Hero */}
      <Section style={{ backgroundColor: a.tint, padding: "40px 32px 28px", textAlign: "center" }}>
        <Text className="tv-float" style={{ fontSize: 56, margin: 0, lineHeight: "64px" }}>{c.emoji}</Text>
        <Text style={{ fontSize: 14, color: a.deep, fontWeight: 600, letterSpacing: 1.5, margin: "12px 0 6px" }}>
          {greeting(sentAt).toUpperCase()}, {first.toUpperCase()} 👋
        </Text>
        <Text style={{ fontSize: 28, lineHeight: "36px", color: "#0F172A", fontWeight: 700, margin: "0 0 10px" }}>{c.headline}</Text>
        <Text style={{ fontSize: 16, lineHeight: "24px", color: "#334155", margin: "0 auto 24px", maxWidth: 440 }}>{c.sub}</Text>
        <CTA href={`${APP_URL}/open/${service}`} label={c.cta} color={a.primary} />
      </Section>

      {/* Feature cards */}
      <Section className="tv-pad" style={{ padding: "28px 28px 8px" }}>
        <Row>
          {c.features.map(([icon, title, body]) => (
            <Column key={title} className="tv-stack" style={{ width: "33%", padding: 6, verticalAlign: "top" }}>
              <Section style={{ border: `1px solid ${a.tint}`, borderRadius: 16, padding: "16px 14px", backgroundColor: "#FFFFFF" }}>
                <Text style={{ fontSize: 26, margin: 0 }}>{icon}</Text>
                <Text className="tv-text" style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", margin: "8px 0 4px" }}>{title}</Text>
                <Text className="tv-muted" style={{ fontSize: 13, lineHeight: "19px", color: "#64748B", margin: 0 }}>{body}</Text>
              </Section>
            </Column>
          ))}
        </Row>
      </Section>

      {/* Spotlight: live, personalised content */}
      {spotlight && (
        <Section style={{ padding: "12px 34px" }}>
          <Section style={{ backgroundColor: "#0F172A", borderRadius: 16, padding: "18px 22px" }}>
            <Text style={{ margin: 0, fontSize: 11, letterSpacing: 2, color: a.primary, fontWeight: 600 }}>
              TODAY IN {city?.toUpperCase()}
            </Text>
            <Text style={{ margin: "6px 0 4px", fontSize: 17, color: "#FFFFFF", fontWeight: 600 }}>{spotlight.title}</Text>
            <Text style={{ margin: 0, fontSize: 14, lineHeight: "21px", color: "#CBD5E1" }}>{spotlight.body}</Text>
          </Section>
        </Section>
      )}

      {/* Setup progress */}
      <Section className="tv-pad" style={{ padding: "20px 40px 8px" }}>
        <Text className="tv-text" style={{ fontSize: 15, fontWeight: 600, color: "#0F172A", margin: "0 0 10px" }}>
          3 quick steps to get the most out of {svc.name}
        </Text>
        {c.steps.map((s, i) => (
          <Row key={s} style={{ marginBottom: 8 }}>
            <Column style={{ width: 36 }}>
              <span style={{ display: "inline-block", width: 26, height: 26, lineHeight: "26px", borderRadius: 13, textAlign: "center",
                backgroundColor: i === 0 ? a.primary : a.tint, color: i === 0 ? "#FFFFFF" : a.deep, fontSize: 13, fontWeight: 700 }}>{i + 1}</span>
            </Column>
            <Column><Text className="tv-muted" style={{ margin: 0, fontSize: 14, color: "#334155" }}>{s}</Text></Column>
          </Row>
        ))}
      </Section>

      {/* Cross-sell the other two worlds */}
      <Section className="tv-pad" style={{ padding: "16px 40px 36px" }}>
        <Text className="tv-muted" style={{ fontSize: 13, color: "#64748B", margin: "0 0 10px" }}>
          Your PvtFrnd has two more worlds. Switch any time from the pin at the top of the app:
        </Text>
        <Row>
          {others.map((o) => (
            <Column key={o} style={{ width: "50%", padding: 4 }}>
              <Section style={{ backgroundColor: SERVICES[o].tint, borderRadius: 14, padding: "12px 14px" }}>
                <Row>
                  <Column style={{ width: 40 }}><Img src={`${ASSET_BASE}/icon-${o}.png`} width={32} height={32} alt="" style={{ borderRadius: 8 }} /></Column>
                  <Column>
                    <Text style={{ margin: 0, fontSize: 14, fontWeight: 600, color: SERVICES[o].deep }}>{SERVICES[o].name}</Text>
                    <Text style={{ margin: 0, fontSize: 12, color: "#475569" }}>{SERVICES[o].tagline}</Text>
                  </Column>
                </Row>
              </Section>
            </Column>
          ))}
        </Row>
      </Section>
    </Layout>
  );
}
