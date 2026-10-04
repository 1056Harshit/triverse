import { useState, type ReactNode } from "react";
import { Alert, Linking, Platform, Pressable, Switch, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { Image as ExpoImage } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ACCENTS, SERVICES, type AccentMode, type MotionLevel, type ServiceId, type ThemeMode } from "@triverse/shared";
import { PinMark } from "@/components/Logo";
import { Button, Card, P, Row, Screen, useTheme } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Haptics } from "@/lib/haptics";

const THEMES: Array<[ThemeMode, string, string]> = [["system", "📱", "System"], ["light", "☀️", "Light"], ["dark", "🌙", "Dark"], ["auto", "🌗", "Auto"]];
const MOTION: Array<[MotionLevel, string, string]> = [["full", "✨", "Full"], ["reduced", "🌤", "Reduced"], ["off", "⏸", "Off"]];
const VOICE: Array<["hi" | "pa" | "en", string]> = [["hi", "हिंदी"], ["pa", "ਪੰਜਾਬੀ"], ["en", "English"]];

/** All app preferences, saved to the account. */
export default function Settings() {
  const t = useTheme();
  const { user, settings, updateSettings, uploadBanner, removeBanner, signOut, deleteAccount, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState<ServiceId | null>(null);
  if (!user) return null;

  const pick = <K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) => { Haptics.selectionAsync(); updateSettings({ [key]: value } as never); };

  const saveName = async () => {
    setSavingName(true);
    try { await api("/me", { method: "PATCH", body: { name: name.trim() } }); await refreshUser(); }
    finally { setSavingName(false); }
  };

  const chooseBanner = async (s: ServiceId) => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    // No editing, so animated GIFs stay animated.
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: false, quality: 0.85, base64: true });
    const a = r.canceled ? null : r.assets[0];
    if (!a?.base64) return;
    if (a.base64.length > 11_000_000) { Alert.alert("Too large", "Please choose an image or GIF under 8 MB."); return; }
    setUploading(s);
    try { await uploadBanner(s, a.base64); }
    catch (e) { Alert.alert("Couldn't upload", e instanceof Error ? e.message : "Try another image."); }
    finally { setUploading(null); }
  };

  const confirmDelete = () => {
    const go = () => deleteAccount().catch((e) => Alert.alert("Couldn't delete", e instanceof Error ? e.message : "Try again"));
    if (Platform.OS === "web") { if (globalThis.confirm?.("Delete your TriVerse account and personal data? This can't be undone.")) go(); return; }
    Alert.alert("Delete account?", "Your profile, saved places, reminders and chats will be erased. This can't be undone.", [
      { text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: go },
    ]);
  };

  return (
    <Screen>
      {/* Appearance */}
      <Section title="Appearance" icon="🎨" index={0}>
        <Label>Theme</Label>
        <Segmented options={THEMES} value={settings.theme} onChange={(v) => pick("theme", v)} />
        <P small muted>{settings.theme === "auto" ? "Dark from 7 PM to 6 AM, light during the day." : settings.theme === "system" ? "Follows your phone's setting." : ""}</P>

        <Label>Colours</Label>
        <Row gap={2} style={{ flexWrap: "wrap" }}>
          <Swatch label="Dynamic" selected={settings.accent === "dynamic"} onPress={() => pick("accent", "dynamic" as AccentMode)}>
            <LinearGradient colors={[SERVICES.farm.primary, SERVICES.ride.primary, SERVICES.dine.primary, SERVICES.health.primary, SERVICES.travel.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }} />
          </Swatch>
          {(Object.keys(ACCENTS) as Array<keyof typeof ACCENTS>).map((k) => (
            <Swatch key={k} label={ACCENTS[k].label} selected={settings.accent === k} onPress={() => pick("accent", k)}>
              <View style={{ flex: 1, backgroundColor: ACCENTS[k].primary }} />
            </Swatch>
          ))}
        </Row>
        <P small muted>{settings.accent === "dynamic" ? "Each world uses its own colour: green Farm, blue Ride, coral Dine, teal Health, purple Travel." : "One colour across the whole app."}</P>
      </Section>

      {/* Motion */}
      <Section title="Animations" icon="🎬" index={1}>
        <Segmented options={MOTION} value={settings.motion} onChange={(v) => pick("motion", v)} />
        <P small muted>{settings.motion === "full" ? "Moving banners, 3D tilt and springy cards." : settings.motion === "reduced" ? "Gentle fades only; easier on the eyes and battery." : "No movement at all; banners stay still."}</P>
      </Section>

      {/* Banners */}
      <Section title="Dashboard banners" icon="🖼" index={2}>
        <P small muted>Use your own photo or an animated GIF as the banner of each world.</P>
        {user.services.map((s) => {
          const custom = settings.banners[s];
          return (
            <Row key={s} style={{ paddingVertical: 4 }}>
              <View style={{ width: 92, height: 54, borderRadius: 12, overflow: "hidden", backgroundColor: SERVICES[s].tint, alignItems: "center", justifyContent: "center" }}>
                {custom ? <ExpoImage source={{ uri: custom }} style={{ width: 92, height: 54 }} contentFit="cover" /> : <PinMark size={30} active={s} />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: "700" }}>{SERVICES[s].name}</Text>
                <Text style={{ color: t.muted, fontSize: 12 }}>{custom ? (custom.match(/\.(gif|webp)$/) ? "Your animated banner" : "Your photo") : "Default"}</Text>
              </View>
              {custom && <Pressable onPress={() => removeBanner(s)} style={{ padding: 8 }}><Text style={{ color: t.muted, fontWeight: "700" }}>Reset</Text></Pressable>}
              <Button label={uploading === s ? "…" : custom ? "Change" : "Upload"} variant="secondary" loading={uploading === s} onPress={() => chooseBanner(s)} style={{ paddingVertical: 9, paddingHorizontal: 14 }} />
            </Row>
          );
        })}
      </Section>

      {/* Accessibility */}
      <Section title="Accessibility & voice" icon="♿" index={3}>
        <Toggle label="Large text" hint="Bigger words and buttons, easier to read" value={settings.largeText} onChange={(v) => pick("largeText", v)} />
        <Toggle label="Haptics" hint="Small vibrations when you tap" value={settings.haptics} onChange={(v) => pick("haptics", v)} />
        <Toggle label="Read answers aloud" hint="Assistants speak every reply automatically" value={settings.autoSpeak} onChange={(v) => pick("autoSpeak", v)} />
        <Label>Voice language</Label>
        <Segmented options={VOICE.map(([v, l]) => [v, "", l] as [typeof v, string, string])} value={settings.voiceLanguage} onChange={(v) => pick("voiceLanguage", v)} />
      </Section>

      {/* Account */}
      <Section title="Account" icon="👤" index={4}>
        <Label>Your name</Label>
        <Row gap={2}>
          <TextInput value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={t.subtle}
            style={{ flex: 1, backgroundColor: t.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16, color: t.text, borderWidth: 1, borderColor: t.border }} />
          <Button label="Save" variant="secondary" loading={savingName} disabled={name.trim().length < 2 || name.trim() === user.name} onPress={saveName} style={{ paddingVertical: 11 }} />
        </Row>
        <Info label="Phone" value={user.phone ?? "Not added"} />
        <Info label="Email" value={user.email ?? "Not added"} />
        <Info label="Verification" value={user.kyc.driver === "verified" ? "Verified driver ✓" : user.kyc.identity === "verified" ? "ID verified ✓" : "Not verified"} />
        <Row gap={2} style={{ marginTop: 6 }}>
          <Button style={{ flex: 1 }} label="My services" variant="secondary" onPress={() => router.push("/profile")} />
          {user.kyc.driver !== "verified" && <Button style={{ flex: 1 }} label="Verify as driver" variant="secondary" onPress={() => router.push("/ride/verify")} />}
        </Row>
      </Section>

      {/* About */}
      <Section title="About" icon="ℹ️" index={5}>
        <Link label="Privacy policy" url="https://pvtfrnd.com/privacy" />
        <Link label="Terms of service" url="https://pvtfrnd.com/terms" />
        <Link label="Help & support" url="https://pvtfrnd.com/help" />
        <P small muted>Maps data © OpenStreetMap contributors. Banner photos from Wikimedia Commons (credited on each photo). Prices shown in the app are estimates and not confirmed.</P>
        <P small muted>TriVerse 1.0.0 · by PvtFrnd</P>
      </Section>

      <Button label="Sign out" variant="secondary" onPress={signOut} />
      <Button label="Delete my account" variant="danger" onPress={confirmDelete} />
      <View style={{ height: 20 }} />
    </Screen>
  );
}

function Section({ title, icon, index, children }: { title: string; icon: string; index: number; children: ReactNode }) {
  const t = useTheme();
  return (
    <Animated.View entering={FadeInDown.delay(index * 70).springify().damping(16)}>
      <Card>
        <Text style={{ fontSize: 18, fontWeight: "800", color: t.text, marginBottom: 4 }}>{icon}  {title}</Text>
        {children}
      </Card>
    </Animated.View>
  );
}

function Label({ children }: { children: ReactNode }) {
  const t = useTheme();
  return <Text style={{ color: t.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1, marginTop: 6 }}>{String(children).toUpperCase()}</Text>;
}

function Segmented<V extends string>({ options, value, onChange }: { options: Array<[V, string, string]>; value: V; onChange: (v: V) => void }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", backgroundColor: t.bg, borderRadius: 14, padding: 4, borderWidth: 1, borderColor: t.border }}>
      {options.map(([v, icon, label]) => {
        const on = v === value;
        return (
          <Pressable key={v} onPress={() => onChange(v)} accessibilityRole="button" accessibilityState={{ selected: on }}
            style={{ flex: 1, paddingVertical: 9, borderRadius: 10, alignItems: "center", backgroundColor: on ? t.primary : "transparent" }}>
            <Text style={{ color: on ? "#fff" : t.text, fontWeight: "700", fontSize: 13 }}>{icon ? `${icon} ` : ""}{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Swatch({ label, selected, onPress, children }: { label: string; selected: boolean; onPress: () => void; children: ReactNode }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityLabel={`${label} colour`} style={{ alignItems: "center", gap: 4 }}>
      <View style={{ width: 46, height: 46, borderRadius: 23, overflow: "hidden", borderWidth: selected ? 3 : 1, borderColor: selected ? t.text : t.border }}>{children}</View>
      <Text style={{ fontSize: 11, color: selected ? t.text : t.muted, fontWeight: selected ? "800" : "500" }}>{label}</Text>
    </Pressable>
  );
}

function Toggle({ label, hint, value, onChange }: { label: string; hint: string; value: boolean; onChange: (v: boolean) => void }) {
  const t = useTheme();
  return (
    <Row style={{ justifyContent: "space-between", paddingVertical: 4 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: t.text, fontWeight: "700" }}>{label}</Text>
        <Text style={{ color: t.muted, fontSize: 12 }}>{hint}</Text>
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: t.primary }} />
    </Row>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  const t = useTheme();
  return (
    <Row style={{ justifyContent: "space-between", paddingVertical: 3 }}>
      <Text style={{ color: t.muted }}>{label}</Text>
      <Text style={{ color: t.text, fontWeight: "600" }}>{value}</Text>
    </Row>
  );
}

function Link({ label, url }: { label: string; url: string }) {
  const t = useTheme();
  return (
    <Pressable onPress={() => Linking.openURL(url)} style={{ paddingVertical: 8, flexDirection: "row", justifyContent: "space-between" }}>
      <Text style={{ color: t.text, fontWeight: "600" }}>{label}</Text>
      <Text style={{ color: t.muted }}>↗</Text>
    </Pressable>
  );
}
