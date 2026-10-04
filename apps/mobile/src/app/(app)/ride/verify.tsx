import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import { Button, Card, Field, H, P, Row, Screen, useTheme } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { pickPhoto } from "@/lib/media";
import Animated, { FadeInRight, ZoomIn } from "react-native-reanimated";
import { Confetti } from "@/components/motion/Extras";

interface Result { status: "verified" | "rejected" | "pending"; checks: { label: string; ok: boolean; note?: string }[] }

export default function Verify() {
  const t = useTheme();
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.name ?? "");
  const [dl, setDl] = useState("");
  const [dob, setDob] = useState("");
  const [rc, setRc] = useState("");
  const [selfie, setSelfie] = useState<string | null>(null);
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string>();

  const photo = async () => {
    const data = await pickPhoto(false);
    if (data) { await api("/me/avatar", { body: { data } }); await refreshUser(); }
  };

  const submit = async () => {
    setBusy(true); setError(undefined);
    try {
      const r = await api<Result>("/kyc/driver", { body: { fullName, dlNumber: dl, dob, rcNumber: rc, selfie, consent } });
      setResult(r);
      await refreshUser();
    } catch (e) { setError(e instanceof ApiError ? e.message : "Verification failed. Try again."); }
    finally { setBusy(false); }
  };

  if (result) {
    const ok = result.status === "verified";
    return (
      <Screen>
        {ok && <Confetti />}
        <View style={{ alignItems: "center", gap: 8, marginTop: 20 }}>
          <Animated.Text entering={ZoomIn.springify().damping(6)} style={{ fontSize: 72 }}>{ok ? "🏅" : "📄"}</Animated.Text>
          <H center>{ok ? "You're a verified driver!" : "We couldn't verify everything"}</H>
        </View>
        <Card>{result.checks.map((c, i) => (
          <Animated.View key={c.label} entering={FadeInRight.delay(300 + i * 150).springify()}><P>{c.ok ? "✅" : "⚠️"} {c.label}</P>{c.note && <P small muted>{c.note}</P>}</Animated.View>
        ))}</Card>
        <Button label={ok ? "Offer your first ride" : "Fix and try again"} onPress={() => (ok ? router.replace("/ride/offer") : setResult(null))} />
      </Screen>
    );
  }

  const dobValid = /^\d{4}-\d{2}-\d{2}$/.test(dob);
  const ready = user?.avatarUrl && fullName.length > 2 && dl.length >= 10 && dobValid && rc.length >= 6 && selfie && consent;

  return (
    <Screen>
      <H>Become a verified driver</H>
      <P muted>We check your documents against government records (Sarathi and Vahan). It takes about 2 minutes, and passengers see your Verified badge.</P>

      <Card>
        <H level="h3">1. Profile photo</H>
        <Row>
          {user?.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={{ width: 64, height: 64, borderRadius: 32 }} /> : <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: t.tint }} />}
          <View style={{ flex: 1 }}><P small>A clear, recent photo of your face. No sunglasses, no group photos.</P></View>
        </Row>
        <Button label={user?.avatarUrl ? "Change photo" : "Add photo"} variant="secondary" onPress={photo} />
      </Card>

      <Card>
        <H level="h3">2. Driving licence</H>
        <Field label="Name exactly as on licence" value={fullName} onChangeText={setFullName} />
        <Field label="DL number" value={dl} onChangeText={(v) => setDl(v.toUpperCase())} placeholder="HP03 20190012345" autoCapitalize="characters" />
        <Field label="Date of birth (YYYY-MM-DD)" value={dob} onChangeText={setDob} placeholder="1994-05-02" keyboardType="numbers-and-punctuation" error={dob && !dobValid ? "Use YYYY-MM-DD" : undefined} />
      </Card>

      <Card>
        <H level="h3">3. Vehicle RC</H>
        <Field label="Registration number" value={rc} onChangeText={(v) => setRc(v.toUpperCase())} placeholder="HP03AB1221" autoCapitalize="characters" />
        <P small muted>We also confirm the insurance is active.</P>
      </Card>

      <Card>
        <H level="h3">4. Live selfie</H>
        <P small>Matched with your licence photo so nobody can use your documents. Camera only.</P>
        {selfie && <Image source={{ uri: `data:image/jpeg;base64,${selfie}` }} style={{ width: 96, height: 96, borderRadius: 48 }} />}
        <Button label={selfie ? "Retake selfie" : "Take selfie"} variant="secondary" onPress={async () => setSelfie(await pickPhoto(true))} />
      </Card>

      <Pressable onPress={() => setConsent(!consent)} style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
        <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: t.primary, backgroundColor: consent ? t.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
          {consent && <Text style={{ color: "#fff", fontWeight: "900" }}>✓</Text>}
        </View>
        <View style={{ flex: 1 }}><P small>I consent to TriVerse verifying my licence, RC and selfie with government databases through its KYC partner. My selfie isn't stored, and I can delete my data any time (DPDP Act 2023).</P></View>
      </Pressable>
      {error && <P>{error}</P>}
      <Button label="Verify me" onPress={submit} loading={busy} disabled={!ready} />
    </Screen>
  );
}
