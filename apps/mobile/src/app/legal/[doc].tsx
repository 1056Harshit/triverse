import { useEffect, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { LEGAL_CONTACT, LEGAL_DOCS, LEGAL_ORDER, type LegalDoc, type LegalDocId } from "@triverse/shared";
import { api } from "@/lib/api";
import { useTheme } from "@/components/ui";
import { useMotion } from "@/lib/theme";

/** In-app Privacy Policy, Terms, Safety & Security and Delete-account pages (same text as the website). */
export default function LegalPage() {
  const t = useTheme();
  const motion = useMotion();
  const { doc } = useLocalSearchParams<{ doc: LegalDocId }>();
  // Show the bundled copy instantly, then the latest text from the server (editable in Supabase).
  const [live, setLive] = useState<LegalDoc | null>(null);
  useEffect(() => {
    setLive(null);
    api<LegalDoc>(`/legal/${doc}`).then(setLive).catch(() => {});
  }, [doc]);
  const d = live ?? LEGAL_DOCS[doc] ?? LEGAL_DOCS.privacy;
  const enter = (i: number) => (motion === "off" ? undefined : FadeInDown.delay(60 + Math.min(i, 6) * 50).duration(320));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10 }}>
        <Pressable accessibilityLabel="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))} hitSlop={12}>
          <Text style={{ fontSize: 26, color: t.text }}>←</Text>
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: "700", color: t.text }} numberOfLines={1}>{d.title}</Text>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, paddingTop: 6, gap: 14, maxWidth: 720, width: "100%", alignSelf: "center" }}>
        <Animated.View entering={enter(0)} style={{ gap: 8 }}>
          <Text style={{ fontSize: 44 }}>{d.icon}</Text>
          <Text style={{ fontSize: 28, fontWeight: "800", color: t.text, letterSpacing: -0.5 }}>{d.title}</Text>
          <Text style={{ color: t.subtle, fontSize: 13 }}>Last updated {d.updated}</Text>
          {d.intro && <Rich text={d.intro} style={{ color: t.muted, fontSize: 15, lineHeight: 22 }} />}
        </Animated.View>

        {(d.sections ?? []).map((s, i) => (
          <Animated.View key={s.heading} entering={enter(i + 1)} style={{ backgroundColor: t.card, borderRadius: 18, padding: 16, gap: 8, borderWidth: 1, borderColor: t.border }}>
            <Text style={{ fontSize: 17, fontWeight: "800", color: t.text }}>{s.heading}</Text>
            {s.bullets?.map((b) => (
              <View key={b} style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: t.primary, marginTop: 8 }} />
                <Rich text={b} style={{ flex: 1, color: t.muted, fontSize: 15, lineHeight: 22 }} />
              </View>
            ))}
            {s.body?.map((p) => <Rich key={p} text={p} style={{ color: t.muted, fontSize: 15, lineHeight: 22 }} />)}
          </Animated.View>
        ))}

        <Pressable onPress={() => Linking.openURL(`mailto:${LEGAL_CONTACT}?subject=${encodeURIComponent(`PvtFrnd — ${d.title}`)}`)}
          style={{ alignSelf: "flex-start", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 999, backgroundColor: t.tint }}>
          <Text style={{ color: t.deep, fontWeight: "700" }}>✉️  Contact us</Text>
        </Pressable>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
          {LEGAL_ORDER.filter((id) => id !== d.id).map((id) => (
            <Pressable key={id} onPress={() => router.replace({ pathname: "/legal/[doc]", params: { doc: id } })}
              style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: t.border }}>
              <Text style={{ color: t.text, fontWeight: "600", fontSize: 13 }}>{LEGAL_DOCS[id].icon} {LEGAL_DOCS[id].title}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/** Renders `**bold**` spans. */
function Rich({ text, style }: { text: string; style: object }) {
  const t = useTheme();
  return (
    <Text style={style}>
      {text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
        part.startsWith("**") ? <Text key={i} style={{ fontWeight: "800", color: t.text }}>{part.slice(2, -2)}</Text> : part)}
    </Text>
  );
}
