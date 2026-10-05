import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder, useAudioRecorderState } from "expo-audio";
import { File } from "expo-file-system";
import { Haptics } from "@/lib/haptics";
import * as SecureStore from "expo-secure-store";
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withRepeat, withSpring, withTiming } from "react-native-reanimated";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useTheme } from "./ui";

export type VoiceLang = "hi" | "pa" | "en";
const LANGS: [VoiceLang, string][] = [["hi", "हिंदी"], ["pa", "ਪੰਜਾਬੀ"], ["en", "English"]];
const LANG_KEY = "triverse.voiceLang";
const MAX_MS = 120_000;

const store = Platform.OS === "web"
  ? { get: async (k: string) => globalThis.localStorage?.getItem(k) ?? null, set: async (k: string, v: string) => globalThis.localStorage?.setItem(k, v) }
  : { get: SecureStore.getItemAsync, set: SecureStore.setItemAsync };

type Phase = "idle" | "recording" | "transcribing";

/**
 * Tap the mic, speak, tap again: the voice is transcribed and handed to `onText`.
 * Built for elderly users: one big button, a clear "listening" state, and the spoken language remembered.
 */
export function VoiceInput({ onText, onPhase, disabled, autoStart }: { onText: (text: string) => void; onPhase?: (p: Phase) => void; disabled?: boolean; autoStart?: boolean }) {
  const t = useTheme();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY, isMeteringEnabled: true });
  const state = useAudioRecorderState(recorder, 120);
  const [phase, setPhaseState] = useState<Phase>("idle");
  const { settings, updateSettings } = useAuth();
  const [lang, setLang] = useState<VoiceLang>(settings.voiceLanguage);
  const [error, setError] = useState<string>();
  const cancelled = useRef(false);
  const limit = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (limit.current) clearTimeout(limit.current); }, []);

  const setPhase = (p: Phase) => { setPhaseState(p); onPhase?.(p); };

  useEffect(() => { store.get(LANG_KEY).then((v) => { if (v === "hi" || v === "pa" || v === "en") setLang(v); }).catch(() => {}); }, []);

  const start = async () => {
    setError(undefined);
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) { setError("Please allow the microphone to speak your question."); return; }
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    cancelled.current = false;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase("recording");
    // Stop automatically at the limit so a forgotten recording doesn't run forever.
    limit.current = setTimeout(() => finish(true), MAX_MS);
  };

  const finish = async (send: boolean) => {
    if (limit.current) { clearTimeout(limit.current); limit.current = null; }
    cancelled.current = !send;
    await recorder.stop();
    await setAudioModeAsync({ playsInSilentMode: true, allowsRecording: false });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const uri = recorder.uri;
    if (!send || !uri) { setPhase("idle"); return; }
    setPhase("transcribing");
    try {
      const audio = await new File(uri).base64();
      const mimeType = uri.endsWith(".webm") ? "audio/webm" : uri.endsWith(".wav") ? "audio/wav" : "audio/m4a";
      const r = await api<{ text: string }>("/speech/transcribe", { body: { audio, mimeType, language: lang } });
      if (!cancelled.current && r.text) onText(r.text);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't understand the recording. Please try again.");
    } finally {
      setPhase("idle");
    }
  };

  // Opened from the "Ask Frnd" mic button: start listening straight away.
  const autoStarted = useRef(false);
  useEffect(() => {
    if (autoStart && !autoStarted.current) { autoStarted.current = true; start(); }
  });

  const pickLang = (l: VoiceLang) => { setLang(l); store.set(LANG_KEY, l).catch(() => {}); updateSettings({ voiceLanguage: l }).catch(() => {}); };

  return (
    <View>
      {phase !== "idle" && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}
          style={{ position: "absolute", bottom: 56, right: -6, width: 300, backgroundColor: t.card, borderRadius: 22, padding: 16, gap: 12, borderWidth: 1, borderColor: t.border, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 18, elevation: 10 }}>
          {phase === "recording" ? (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Pulse />
                <Text style={{ fontSize: 17, fontWeight: "800", color: t.text, flex: 1 }}>Listening… speak now</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: t.muted, fontVariant: ["tabular-nums"] }}>{fmt(state.durationMillis)}</Text>
              </View>
              <Level metering={state.metering} color={t.primary} />
              <View style={{ flexDirection: "row", gap: 6 }}>
                {LANGS.map(([id, label]) => (
                  <Pressable key={id} onPress={() => pickLang(id)} style={{ flex: 1, paddingVertical: 7, borderRadius: 999, alignItems: "center", backgroundColor: lang === id ? t.primary : t.bg, borderWidth: 1, borderColor: lang === id ? t.primary : t.border }}>
                    <Text style={{ color: lang === id ? "#fff" : t.text, fontWeight: "700", fontSize: 13 }}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable onPress={() => finish(false)} style={{ flex: 1, paddingVertical: 13, borderRadius: 999, borderWidth: 1.5, borderColor: t.border, alignItems: "center" }}>
                  <Text style={{ fontWeight: "700", color: t.text, fontSize: 15 }}>✕ Cancel</Text>
                </Pressable>
                <Pressable onPress={() => finish(true)} style={{ flex: 1.4, paddingVertical: 13, borderRadius: 999, backgroundColor: t.primary, alignItems: "center" }}>
                  <Text style={{ fontWeight: "800", color: "#fff", fontSize: 15 }}>✓ Done, send</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 }}>
              <ActivityIndicator color={t.primary} />
              <Text style={{ fontSize: 16, fontWeight: "700", color: t.text }}>Understanding your voice…</Text>
            </View>
          )}
        </Animated.View>
      )}
      {error && phase === "idle" && (
        <Pressable onPress={() => setError(undefined)} style={{ position: "absolute", bottom: 56, right: -6, width: 260, backgroundColor: "#FEF2F2", borderRadius: 14, padding: 12, borderWidth: 1, borderColor: "#FCA5A5" }}>
          <Text style={{ color: "#991B1B", fontSize: 14 }}>{error}</Text>
        </Pressable>
      )}
      <Pressable
        accessibilityRole="button" accessibilityLabel={phase === "recording" ? "Stop and send voice message" : "Speak your question"}
        disabled={disabled || phase === "transcribing"}
        onPress={() => (phase === "recording" ? finish(true) : start())}
        style={({ pressed }) => ({ width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: phase === "recording" ? t.danger : t.primary, opacity: disabled ? 0.4 : 1, transform: [{ scale: pressed ? 0.92 : 1 }] })}>
        <Text style={{ fontSize: phase === "recording" ? 18 : 22, color: "#fff" }}>{phase === "recording" ? "■" : "🎤"}</Text>
      </Pressable>
    </View>
  );
}

function Pulse() {
  const s = useSharedValue(1);
  useEffect(() => { s.set(withRepeat(withTiming(1.6, { duration: 700 }), -1, true)); }, [s]);
  const ring = useAnimatedStyle(() => ({ transform: [{ scale: s.get() }], opacity: 2 - s.get() }));
  return (
    <View style={{ width: 18, height: 18, alignItems: "center", justifyContent: "center" }}>
      <Animated.View style={[{ position: "absolute", width: 18, height: 18, borderRadius: 9, backgroundColor: "#EF4444" }, ring]} />
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: "#DC2626" }} />
    </View>
  );
}

/** Live loudness bars so users can see the phone hears them. */
function Level({ metering, color }: { metering?: number; color: string }) {
  // metering is dBFS (≈ -60 silent … 0 loud).
  const level = Math.max(0, Math.min(1, ((metering ?? -60) + 60) / 50));
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4, height: 34 }}>
      {Array.from({ length: 24 }, (_, i) => <Bar key={i} i={i} level={level} color={color} />)}
    </View>
  );
}
function Bar({ i, level, color }: { i: number; level: number; color: string }) {
  const h = useSharedValue(4);
  const shape = 0.45 + 0.55 * Math.abs(Math.sin(i * 1.7));
  useEffect(() => { h.set(withSpring(4 + level * 30 * shape, { damping: 12, stiffness: 180 })); }, [h, level, shape]);
  const s = useAnimatedStyle(() => ({ height: h.get() }));
  return <Animated.View style={[{ flex: 1, borderRadius: 3, backgroundColor: color, opacity: 0.85 }, s]} />;
}

const fmt = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")}`;
