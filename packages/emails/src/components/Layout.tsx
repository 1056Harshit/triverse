import * as React from "react";
import { Body, Column, Container, Font, Head, Hr, Html, Img, Link, Preview, Row, Section, Text } from "react-email";
import { BRAND } from "@triverse/shared";
import { accent, ASSET_BASE, APP_URL, font, type Accent } from "../theme.ts";

interface Props {
  preview: string;
  accentKey?: Accent;
  children: React.ReactNode;
  /** Transactional mails (OTP, bookings) must not carry an unsubscribe link. */
  marketing?: boolean;
}

/** Shared shell: branded header band, white card, rich footer. */
export function Layout({ preview, accentKey = "brand", children, marketing = false }: Props) {
  const a = accent(accentKey);
  return (
    <Html lang="en">
      <Head>
        <Font fontFamily="Poppins" fallbackFontFamily="Helvetica"
          webFont={{ url: "https://fonts.gstatic.com/s/poppins/v21/pxiByp8kv8JHgFVrLEj6Z1xlFQ.woff2", format: "woff2" }}
          fontWeight={600} fontStyle="normal" />
        <style>{`
          @keyframes tv-pop { 0%{transform:scale(.7)} 70%{transform:scale(1.08)} 100%{transform:scale(1)} }
          @keyframes tv-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
          .tv-pop { animation: tv-pop .6s ease-out both; }
          .tv-float { animation: tv-float 3s ease-in-out infinite; }
          @media (prefers-color-scheme: dark) {
            .tv-card { background:#111827 !important; }
            .tv-text { color:#E5E7EB !important; }
            .tv-muted { color:#9CA3AF !important; }
          }
          @media only screen and (max-width:600px){ .tv-pad{ padding:24px 20px !important; } .tv-stack{ display:block !important; width:100% !important; } }
        `}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body style={{ margin: 0, backgroundColor: "#F1F5F9", fontFamily: font }}>
        <Container style={{ maxWidth: 600, margin: "0 auto", padding: "24px 12px" }}>
          <Section style={{ backgroundColor: BRAND.navy, borderRadius: "20px 20px 0 0", padding: "20px 28px" }}>
            <Row>
              <Column style={{ width: 44 }}>
                <Img src={`${ASSET_BASE}/email-mark.png`} width={34} height={42} alt="PvtFrnd" className="tv-float" />
              </Column>
              <Column>
                <Text style={{ margin: 0, fontSize: 22, fontWeight: 600, color: "#FFFFFF", letterSpacing: -0.5 }}>
                  Tri<span style={{ color: "#7FA6F5" }}>Verse</span>
                </Text>
              </Column>
              <Column align="right">
                <Text style={{ margin: 0, fontSize: 11, letterSpacing: 2, color: "#A5B4FC" }}>YOUR FRIEND FOR EVERYTHING</Text>
              </Column>
            </Row>
          </Section>
          <Section style={{ height: 5, backgroundColor: a.primary, lineHeight: "5px", fontSize: 0 }}>&nbsp;</Section>
          <Section className="tv-card" style={{ backgroundColor: "#FFFFFF", borderRadius: "0 0 20px 20px" }}>
            {children}
          </Section>
          <Section style={{ padding: "24px 8px", textAlign: "center" }}>
            <Row>
              <Column align="center">
                {(["farm", "ride", "dine"] as const).map((s) => (
                  <Link key={s} href={`${APP_URL}/open/${s}`} style={{ display: "inline-block", margin: "0 6px" }}>
                    <Img src={`${ASSET_BASE}/icon-${s}.png`} width={36} height={36} alt={s} style={{ borderRadius: 10 }} />
                  </Link>
                ))}
              </Column>
            </Row>
            <Text style={{ fontSize: 12, color: "#64748B", margin: "14px 0 4px" }}>
              PvtFrnd · Your private friend for farming, rides, food, health and travel
            </Text>
            <Text style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>
              <Link href={`${APP_URL}/help`} style={{ color: "#94A3B8" }}>Help centre</Link> ·{" "}
              <Link href={`${APP_URL}/privacy`} style={{ color: "#94A3B8" }}>Privacy</Link>
              {marketing && (
                <>
                  {" "}· <Link href={`${APP_URL}/email/unsubscribe`} style={{ color: "#94A3B8" }}>Unsubscribe</Link>
                </>
              )}
            </Text>
            <Hr style={{ borderColor: "#E2E8F0", margin: "16px 0 8px" }} />
            <Text style={{ fontSize: 10, color: "#CBD5E1", margin: 0 }}>© {new Date().getFullYear()} PvtFrnd. All rights reserved.</Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

export function CTA({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <Link href={href} style={{
      display: "inline-block", backgroundColor: color, color: "#FFFFFF", fontSize: 16, fontWeight: 600,
      padding: "14px 30px", borderRadius: 999, textDecoration: "none",
    }}>{label} →</Link>
  );
}
