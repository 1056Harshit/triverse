import * as React from "react";
import { Section, Text } from "react-email";
import { CTA, Layout } from "../src/components/Layout.tsx";
import { APP_URL, greeting } from "../src/theme.ts";

export interface SigninEmailProps {
  name?: string;
  method: "email" | "phone" | "google" | "apple";
  device?: string;
  at?: string;
  sentAt?: Date;
}

const METHOD = { email: "an email code", phone: "a phone code", google: "Google", apple: "Apple" };

/** Sent on every sign-in after the first: a friendly welcome back that doubles as a security alert. */
export default function SigninEmail({ name, method = "email", device = "PvtFrnd app on Android", at = "4 Oct 2026, 9:41 AM IST", sentAt }: SigninEmailProps) {
  const first = name?.split(" ")[0];
  return (
    <Layout preview={`${greeting(sentAt)}${first ? `, ${first}` : ""}: you just signed in to PvtFrnd.`}>
      <Section className="tv-pad" style={{ padding: "36px 40px 10px", textAlign: "center" }}>
        <Text className="tv-pop" style={{ fontSize: 48, margin: 0 }}>👋</Text>
        <Text className="tv-text" style={{ fontSize: 26, fontWeight: 700, color: "#0F172A", margin: "8px 0 6px" }}>
          Welcome back{first ? `, ${first}` : ""}!
        </Text>
        <Text className="tv-muted" style={{ fontSize: 15, color: "#475569", margin: 0 }}>
          You just signed in to PvtFrnd with {METHOD[method]}.
        </Text>
      </Section>
      <Section style={{ padding: "16px 40px" }}>
        <Section style={{ backgroundColor: "#F8FAFC", borderRadius: 14, padding: "14px 18px", border: "1px solid #E2E8F0" }}>
          <Text style={{ margin: 0, fontSize: 12, color: "#64748B", letterSpacing: 1 }}>SIGN-IN DETAILS</Text>
          <Text style={{ margin: "6px 0 0", fontSize: 14, color: "#0F172A" }}>📱 {device}</Text>
          <Text style={{ margin: "2px 0 0", fontSize: 14, color: "#0F172A" }}>🕒 {at}</Text>
        </Section>
      </Section>
      <Section style={{ padding: "8px 40px 8px", textAlign: "center" }}>
        <CTA href={`${APP_URL}/open`} label="Continue in PvtFrnd" color="#2F6FEB" />
      </Section>
      <Section className="tv-pad" style={{ padding: "18px 40px 34px" }}>
        <Text style={{ fontSize: 13, color: "#991B1B", backgroundColor: "#FEF2F2", borderRadius: 12, padding: "12px 16px", margin: 0 }}>
          🛡 Not you? Someone may have your code. Sign out of all devices from Profile in the app, and never share your OTP with anyone.
        </Text>
      </Section>
    </Layout>
  );
}
