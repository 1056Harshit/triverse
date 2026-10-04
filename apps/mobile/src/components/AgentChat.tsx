import { useEffect, useRef, useState } from "react";
import { FlatList, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Speech from "expo-speech";
import { VoiceInput } from "./VoiceInput";
import { useAuth } from "@/lib/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SERVICES, type AgentCard, type AgentId } from "@triverse/shared";
import { chatStream } from "@/lib/api";
import { useHere } from "@/lib/location";
import { radius } from "@/lib/theme";
import { PinMark } from "./Logo";
import { AgentCardView } from "./cards/AgentCards";
import { useTheme } from "./ui";
import Animated, { FadeInRight, FadeInUp } from "react-native-reanimated";

type Img = { uri: string; data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };
interface Msg { id: string; role: "user" | "agent"; text: string; images?: string[]; cards: AgentCard[]; tools: string[]; error?: boolean; done?: boolean }

const TOOL_LABEL: Record<string, string> = {
  web_search: "Searching marketplaces", get_farm_weather: "Checking the weather", check_pesticide: "Checking the banned list",
  estimate_trip: "Calculating the route", search_rides: "Finding rides", find_places: "Comparing ratings", render_poster: "Designing a poster",
  find_hospitals: "Finding hospitals near you", add_medicine_reminder: "Saving your reminder", plan_route: "Planning the route", trip_weather: "Checking the forecast",
  find_sights: "Finding sights", find_stays: "Finding stays", show_plan: "Preparing your plan", mandi_prices: "Checking mandi prices", ask_agent: "Asking the right expert",
};

export function AgentChat({ agent, suggestions, initialPrompt, autoCamera, autoVoice }: { agent: AgentId; suggestions: string[]; initialPrompt?: string; autoCamera?: boolean; autoVoice?: boolean }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { settings } = useAuth();
  const { here } = useHere();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setKeyboardOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  // Native stack header height: status bar inset + bar.
  const headerHeight = insets.top + (Platform.OS === "ios" ? 44 : 56);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState(initialPrompt ?? "");
  const [pending, setPending] = useState<Img[]>([]);
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState<string | null>(null);
  useEffect(() => () => { Speech.stop(); }, []);

  /** Reads an answer aloud in the script it was written in. */
  const listen = (m: Msg) => {
    if (speaking === m.id) { Speech.stop(); setSpeaking(null); return; }
    Speech.stop();
    const text = m.text.replace(/[*#_`>]/g, "");
    const language = /[\u0A00-\u0A7F]/.test(text) ? "pa-IN" : /[\u0900-\u097F]/.test(text) ? "hi-IN" : "en-IN";
    setSpeaking(m.id);
    Speech.speak(text, { language, rate: 0.92, onDone: () => setSpeaking(null), onStopped: () => setSpeaking(null), onError: () => setSpeaking(null) });
  };
  const convo = useRef<string | undefined>(undefined);
  const stop = useRef<(() => void) | null>(null);
  const list = useRef<FlatList<Msg>>(null);
  const name = agent === "promo" ? "Campaign Studio" : agent === "triverse" ? "Ask TriVerse" : SERVICES[agent].agentName;
  const pinFor = agent === "promo" || agent === "triverse" ? "brand" : agent;

  useEffect(() => () => stop.current?.(), []);

  const patchLast = (fn: (m: Msg) => Msg) => setMsgs((all) => all.map((m, i) => (i === all.length - 1 ? fn(m) : m)));

  const send = (text = input) => {
    const message = text.trim();
    if (!message || busy) return;
    const images = pending;
    setInput(""); setPending([]); setBusy(true);
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: "user", text: message, images: images.map((i) => i.uri), cards: [], tools: [] },
      { id: `a${Date.now()}`, role: "agent", text: "", cards: [], tools: [] }]);
    stop.current = chatStream(agent, {
      conversationId: convo.current, message, images: images.map(({ data, mediaType }) => ({ data, mediaType })),
      location: here ?? undefined,
    }, (e) => {
      if (e.type === "text") patchLast((m) => ({ ...m, text: m.text + e.delta }));
      else if (e.type === "tool") patchLast((m) => ({ ...m, tools: [...m.tools, e.name] }));
      else if (e.type === "card") patchLast((m) => ({ ...m, cards: [...m.cards, e.card] }));
      else if (e.type === "done") {
        convo.current = e.conversationId;
        patchLast((m) => { const done = { ...m, done: true }; if (settings.autoSpeak && done.text) setTimeout(() => listen(done), 50); return done; });
        setBusy(false);
      }
      else if (e.type === "error") { patchLast((m) => ({ ...m, text: m.text || e.message, error: true, done: true })); setBusy(false); }
      requestAnimationFrame(() => list.current?.scrollToEnd({ animated: true }));
    });
  };

  const attach = async (camera: boolean) => {
    const perm = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], base64: true, quality: 0.6, allowsEditing: true };
    const r = camera ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    const a = r.canceled ? null : r.assets[0];
    if (a?.base64) setPending((p) => [...p, { uri: a.uri, data: a.base64!, mediaType: (a.mimeType as Img["mediaType"]) ?? "image/jpeg" }].slice(-4));
  };

  // Opened from "Scan a sick plant": go straight to the camera once.
  const autoOpened = useRef(false);
  useEffect(() => {
    if (autoCamera && !autoOpened.current) { autoOpened.current = true; attach(true); }
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <FlatList
        ref={list} data={msgs} keyExtractor={(m) => m.id} contentContainerStyle={{ padding: 16, paddingBottom: 24, gap: 14, flexGrow: 1 }}
        keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive"
        onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingVertical: 40 }}>
            <PinMark size={64} active={pinFor} animate="intro" />
            <Text style={{ fontSize: 22, fontWeight: "800", color: t.text }}>Ask {name}</Text>
            <View style={{ gap: 8, width: "100%" }}>
              {suggestions.map((s) => (
                <Pressable key={s} onPress={() => send(s)} style={{ padding: 14, borderRadius: radius.md, backgroundColor: t.card, borderWidth: 1, borderColor: t.border }}>
                  <Text style={{ color: t.text }}>{s}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
        renderItem={({ item: m }) => m.role === "user" ? (
          <Animated.View entering={FadeInUp.springify().damping(16)} style={{ alignSelf: "flex-end", maxWidth: "85%", gap: 6 }}>
            {m.images?.map((u) => <Image key={u} source={{ uri: u }} style={{ width: 180, height: 180, borderRadius: 14, alignSelf: "flex-end" }} />)}
            <View style={{ backgroundColor: t.primary, borderRadius: 18, borderBottomRightRadius: 4, padding: 12 }}><Text style={{ color: "#fff", fontSize: 15 }}>{m.text}</Text></View>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInUp.delay(120).springify().damping(16)} style={{ gap: 8, maxWidth: "95%" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <PinMark size={22} active={pinFor} animate={m.done ? "none" : "thinking"} />
              <Text style={{ color: t.muted, fontSize: 12, fontWeight: "600" }}>
                {m.done ? name : m.tools.length ? `${TOOL_LABEL[m.tools.at(-1)!] ?? "Working"}…` : "Thinking…"}
              </Text>
            </View>
            {!!m.text && <View style={{ backgroundColor: t.card, borderRadius: 18, borderTopLeftRadius: 4, padding: 12, borderWidth: 1, borderColor: m.error ? t.danger : t.border }}>
              <Text style={{ color: t.text, fontSize: 15, lineHeight: 22 }}>{m.text.replace(/\*\*/g, "")}</Text>
            </View>}
            {m.cards.map((c, i) => <Animated.View key={i} entering={FadeInRight.delay(i * 90).springify()}><AgentCardView card={c} /></Animated.View>)}
            {m.done && !m.error && !!m.text && (
              <Pressable accessibilityLabel={speaking === m.id ? "Stop reading" : "Read answer aloud"} onPress={() => listen(m)}
                style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999, backgroundColor: t.tint }}>
                <Text style={{ fontSize: 16 }}>{speaking === m.id ? "⏹" : "🔊"}</Text>
                <Text style={{ color: t.deep, fontWeight: "700" }}>{speaking === m.id ? "Stop" : "Listen"}</Text>
              </Pressable>
            )}
          </Animated.View>
        )}
      />
      {pending.length > 0 && (
        <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingBottom: 8 }}>
          {pending.map((p, i) => (
            <Pressable key={p.uri} onPress={() => setPending((x) => x.filter((_, j) => j !== i))}>
              <Image source={{ uri: p.uri }} style={{ width: 56, height: 56, borderRadius: 10 }} />
              <Text style={{ position: "absolute", right: 2, top: 0, color: "#fff", fontWeight: "800" }}>×</Text>
            </Pressable>
          ))}
        </View>
      )}
      {/* Composer sits above the home indicator / Android nav bar; the inset drops away while typing. */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingTop: 10, paddingBottom: keyboardOpen ? 10 : Math.max(insets.bottom, 12) + 4, borderTopWidth: 1, borderColor: t.border, backgroundColor: t.card }}>
        {(agent === "farm" || agent === "health" || agent === "triverse") && <>
          <Pressable accessibilityLabel="Take photo" onPress={() => attach(true)} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: t.tint, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 19 }}>📷</Text></Pressable>
          <Pressable accessibilityLabel="Choose photo" onPress={() => attach(false)} style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: t.tint, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 19 }}>🖼</Text></Pressable>
        </>}
        <TextInput value={input} onChangeText={setInput} placeholder={`Type or tap 🎤 to speak`} placeholderTextColor={t.subtle} multiline
          style={{ flex: 1, minHeight: 44, maxHeight: 120, backgroundColor: t.bg, borderRadius: 22, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, fontSize: 16, color: t.text, borderWidth: 1, borderColor: t.border }} />
        {busy || input.trim() || pending.length ? (
          <Pressable accessibilityLabel={busy ? "Stop" : "Send"} onPress={() => (busy ? (stop.current?.(), setBusy(false)) : send())}
            style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: t.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontSize: 18, fontWeight: "800" }}>{busy ? "■" : "↑"}</Text>
          </Pressable>
        ) : (
          // Empty box: the button becomes a microphone, so anyone can just speak their problem.
          <VoiceInput onText={(text) => send(text)} autoStart={autoVoice && msgs.length === 0} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}
