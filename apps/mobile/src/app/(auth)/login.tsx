import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { PinMark } from "@/components/Logo";
import { Button, Field, H, P, useTheme } from "@/components/ui";
import { api, ApiError } from "@/lib/api";

export default function Login() {
  const t = useTheme();
  const params = useLocalSearchParams<{ channel?: "sms" | "email" }>();
  const [channel, setChannel] = useState<"sms" | "email">(params.channel ?? "sms");
  const [value, setValue] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const valid = channel === "email" ? /^\S+@\S+\.\S+$/.test(value) : value.replace(/\D/g, "").length >= 10;

  const send = async () => {
    setBusy(true); setError(undefined);
    try {
      const r = await api<{ target: string }>("/auth/otp/send", { body: { channel, target: channel === "sms" ? value : value.trim() } });
      router.push({ pathname: "/otp", params: { channel, target: r.target } });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't send the code. Check your connection.");
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, padding: 24, gap: 20 }}>
        <Pressable onPress={() => router.back()}><Text style={{ fontSize: 26, color: t.text }}>←</Text></Pressable>
        <PinMark size={56} />
        <H level="hero">{channel === "sms" ? "What's your number?" : "What's your email?"}</H>
        <P muted>We'll send you a 6-digit code. No passwords to remember.</P>

        <View style={{ flexDirection: "row", backgroundColor: t.card, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: t.border }}>
          {(["sms", "email"] as const).map((c) => (
            <Pressable key={c} onPress={() => { setChannel(c); setValue(""); setError(undefined); }}
              style={{ flex: 1, paddingVertical: 10, borderRadius: 999, backgroundColor: channel === c ? t.primary : "transparent", alignItems: "center" }}>
              <Text style={{ color: channel === c ? "#fff" : t.text, fontWeight: "700" }}>{c === "sms" ? "Phone" : "Email"}</Text>
            </Pressable>
          ))}
        </View>

        {channel === "sms" ? (
          <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-end" }}>
            <View style={{ backgroundColor: t.card, borderRadius: 10, borderWidth: 1.5, borderColor: t.border, paddingHorizontal: 14, paddingVertical: 13 }}>
              <Text style={{ fontSize: 16, color: t.text }}>🇮🇳 +91</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Mobile number" value={value} onChangeText={setValue} keyboardType="phone-pad" autoComplete="tel" textContentType="telephoneNumber" maxLength={14} placeholder="98160 12345" error={error} autoFocus />
            </View>
          </View>
        ) : (
          <Field label="Email" value={value} onChangeText={setValue} keyboardType="email-address" autoCapitalize="none" autoComplete="email" textContentType="emailAddress" placeholder="you@example.com" error={error} autoFocus />
        )}
        <View style={{ flex: 1 }} />
        <Button label="Send code" onPress={send} loading={busy} disabled={!valid} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
