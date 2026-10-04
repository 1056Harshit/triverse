import * as React from "react";
import { Column, Row, Section, Text } from "react-email";
import { Layout } from "../src/components/Layout.tsx";
import { accent } from "../src/theme.ts";

export interface OtpEmailProps {
  code: string;
  minutesValid?: number;
  purpose?: "login" | "signup" | "verify_email";
  /** Shown so users can spot requests they didn't make. */
  requestedFrom?: { device?: string; city?: string; at?: string };
}

const PURPOSE = {
  login: "sign in to TriVerse",
  signup: "finish creating your TriVerse account",
  verify_email: "verify this email address",
};

export default function OtpEmail({ code = "482916", minutesValid = 10, purpose = "login", requestedFrom = { device: "Chrome on Android", city: "Shimla, HP", at: "3 Oct 2026, 9:41 AM IST" } }: OtpEmailProps) {
  const a = accent("brand");
  return (
    <Layout preview={`${code} is your TriVerse code. It expires in ${minutesValid} minutes.`}>
      <Section className="tv-pad" style={{ padding: "36px 40px 8px", textAlign: "center" }}>
        <Text style={{ fontSize: 40, margin: 0 }}>🔐</Text>
        <Text className="tv-text" style={{ fontSize: 24, fontWeight: 600, color: "#0F172A", margin: "8px 0 4px" }}>Your one-time code</Text>
        <Text className="tv-muted" style={{ fontSize: 15, color: "#475569", margin: 0 }}>
          Use this code to {PURPOSE[purpose]}.
        </Text>
      </Section>
      <Section style={{ padding: "20px 24px" }}>
        <Row>
          <Column align="center">
            {code.split("").map((d, i) => (
              <span key={i} className="tv-pop" style={{
                display: "inline-block", width: 46, height: 58, lineHeight: "58px", margin: "0 4px",
                borderRadius: 12, backgroundColor: a.tint, border: `2px solid ${a.primary}`,
                color: a.deep, fontSize: 30, fontWeight: 700, fontFamily: "'SF Mono', Menlo, Consolas, monospace",
                animationDelay: `${i * 80}ms`,
              }}>{d}</span>
            ))}
          </Column>
        </Row>
        <Text style={{ textAlign: "center", fontSize: 13, color: "#64748B", margin: "14px 0 0" }}>
          ⏱ Expires in <b>{minutesValid} minutes</b> · single use
        </Text>
      </Section>
      {requestedFrom && (
        <Section style={{ padding: "0 40px" }}>
          <Section style={{ backgroundColor: "#F8FAFC", borderRadius: 14, padding: "14px 18px", border: "1px solid #E2E8F0" }}>
            <Text style={{ margin: 0, fontSize: 12, color: "#64748B", letterSpacing: 1 }}>REQUEST DETAILS</Text>
            <Text style={{ margin: "6px 0 0", fontSize: 14, color: "#0F172A" }}>
              {[requestedFrom.device, requestedFrom.city, requestedFrom.at].filter(Boolean).join(" · ")}
            </Text>
          </Section>
        </Section>
      )}
      <Section className="tv-pad" style={{ padding: "20px 40px 36px" }}>
        <Text style={{ fontSize: 13, color: "#B91C1C", backgroundColor: "#FEF2F2", borderRadius: 12, padding: "12px 16px", margin: 0 }}>
          🛡 Never share this code. TriVerse staff, drivers and sellers will <b>never</b> ask for it.
          If you didn't request it, you can ignore this email; your account is safe.
        </Text>
      </Section>
    </Layout>
  );
}
