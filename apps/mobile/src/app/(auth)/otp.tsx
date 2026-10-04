import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Haptics } from "@/lib/haptics";
import { Button, H, P, useTheme } from "@/components/ui";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const LEN = 6;

export default function Otp() {
  const t = useTheme();
  const { signIn } = useAuth();
  const { channel, target } = useLocalSearchParams<{ channel: "sms" | "email"; target: string }>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(30);
  const input = useRef<TextInput>(null);

  useEffect(() => {
    const id = setInterval(() => setWait((w) => (w > 0 ? w - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, []);

  const verify = async (c = code) => {
    if (c.length !== LEN) return;
    setBusy(true); setError(undefined);
    try {
      const r = await api<any>("/auth/otp/verify", { body: { channel, target, code: c } });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await signIn(r);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(e instanceof ApiError ? e.message : "Couldn't verify. Try again.");
      setCode("");
    } finally { setBusy(false); }
  };

  const resend = async () => {
    setError(undefined);
    try {
      await api("/auth/otp/send", { body: { channel, target } });
      setWait(30);
    }
    catch (e) { setError(e instanceof ApiError ? e.message : "Couldn't resend."); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, padding: 24, gap: 20 }}>
      <Pressable onPress={() => router.back()}><Text style={{ fontSize: 26, color: t.text }}>←</Text></Pressable>
      <H level="hero">Enter the code</H>
      <P muted>Sent to {target}. {channel === "email" ? "Check your inbox (and spam)." : "It may take a few seconds."}</P>

      <Pressable onPress={() => input.current?.focus()} style={{ flexDirection: "row", justifyContent: "space-between" }}>
        {Array.from({ length: LEN }, (_, i) => {
          const filled = i < code.length, focused = i === code.length;
          return (
            <View key={i} style={{ width: 50, height: 62, borderRadius: 14, borderWidth: 2, borderColor: error ? t.danger : focused ? t.primary : filled ? t.deep : t.border, backgroundColor: filled ? t.tint : t.card, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 28, fontWeight: "800", color: t.deep }}>{code[i] ?? ""}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput ref={input} value={code} autoFocus keyboardType="number-pad" textContentType="oneTimeCode" autoComplete="sms-otp" maxLength={LEN}
        onChangeText={(v) => { const c = v.replace(/\D/g, ""); setCode(c); if (c.length === LEN) verify(c); }}
        style={{ position: "absolute", opacity: 0, height: 1, width: 1 }} />
      {error && <Text style={{ color: t.danger }}>{error}</Text>}

      <Pressable disabled={wait > 0} onPress={resend}>
        <Text style={{ color: wait > 0 ? t.subtle : t.primary, fontWeight: "700" }}>{wait > 0 ? `Resend code in ${wait}s` : "Resend code"}</Text>
      </Pressable>
      <View style={{ flex: 1 }} />
      <P small muted center>🛡 TriVerse will never call you to ask for this code.</P>
      <Button label="Verify" onPress={() => verify()} loading={busy} disabled={code.length !== LEN} />
    </SafeAreaView>
  );
}
