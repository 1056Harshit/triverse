import * as React from "react";
import { Img, Section, Text } from "react-email";
import type { ServiceId } from "@triverse/shared";
import { CTA, Layout } from "../src/components/Layout.tsx";
import { accent, APP_URL } from "../src/theme.ts";

/** Filled by the promo agent: copy + a rendered poster URL. */
export interface CampaignEmailProps {
  service: ServiceId;
  preview: string;
  posterUrl: string;
  headline: string;
  body: string;
  offer?: { code: string; detail: string };
  cta: { label: string; path: string };
}

export default function CampaignEmail({
  service = "dine", preview = "This weekend: 20% off at Shimla's top-rated cafés", posterUrl = "https://pvtfrnd.com/brand/logo-lockup.png",
  headline = "Weekend café trail ☕", body = "Five TriScore 4.7+ cafés on the Mall Road, hand-picked by Swad Guide. Show this code at the counter.",
  offer = { code: "SWAD20", detail: "20% off up to ₹150 · till Sunday" }, cta = { label: "See the trail", path: "/open/dine" },
}: CampaignEmailProps) {
  const a = accent(service);
  return (
    <Layout preview={preview} accentKey={service} marketing>
      <Img src={posterUrl} width={600} alt={headline} style={{ width: "100%", height: "auto", display: "block" }} />
      <Section className="tv-pad" style={{ padding: "28px 36px 8px" }}>
        <Text style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: "0 0 8px" }}>{headline}</Text>
        <Text style={{ fontSize: 15, lineHeight: "24px", color: "#334155", margin: 0 }}>{body}</Text>
      </Section>
      {offer && (
        <Section style={{ padding: "16px 36px" }}>
          <Section style={{ border: `2px dashed ${a.primary}`, borderRadius: 16, padding: "14px", textAlign: "center", backgroundColor: a.tint }}>
            <Text style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: 4, color: a.deep }}>{offer.code}</Text>
            <Text style={{ margin: "2px 0 0", fontSize: 13, color: "#475569" }}>{offer.detail}</Text>
          </Section>
        </Section>
      )}
      <Section style={{ padding: "16px 36px 36px", textAlign: "center" }}>
        <CTA href={`${APP_URL}${cta.path}`} label={cta.label} color={a.primary} />
      </Section>
    </Layout>
  );
}
