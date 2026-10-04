import { useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { api } from "@/lib/api";
import { Field, useTheme } from "./ui";

export interface Place { name: string; lat: number; lng: number }

/** Text field that resolves the typed place to coordinates on blur. */
export function PlaceInput({ label, value, onChange, placeholder }: { label: string; value: Place | null; onChange: (p: Place | null) => void; placeholder?: string }) {
  const t = useTheme();
  const [text, setText] = useState(value?.name ?? "");
  const [state, setState] = useState<"idle" | "loading" | "missing">("idle");

  const resolve = async () => {
    if (text.trim().length < 2 || text === value?.name) return;
    setState("loading");
    const hits = await api<Place[]>(`/geo/search?q=${encodeURIComponent(text.trim())}`).catch(() => []);
    if (hits[0]) { onChange(hits[0]); setText(hits[0].name); setState("idle"); } else { onChange(null); setState("missing"); }
  };

  return (
    <View>
      <Field label={label} value={text} onChangeText={(v) => { setText(v); if (value) onChange(null); }} onBlur={resolve} onSubmitEditing={resolve}
        placeholder={placeholder} returnKeyType="search" error={state === "missing" ? "Couldn't find that place. Try a nearby town." : undefined} />
      {state === "loading" && <ActivityIndicator style={{ position: "absolute", right: 12, top: 38 }} color={t.primary} />}
      {value && <Text style={{ position: "absolute", right: 14, top: 38, color: t.success, fontWeight: "800" }}>✓</Text>}
    </View>
  );
}
