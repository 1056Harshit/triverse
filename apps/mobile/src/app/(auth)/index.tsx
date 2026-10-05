import { useEffect, useState } from "react";
import { Alert, Platform, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import * as AppleAuthentication from "expo-apple-authentication";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SERVICES, SERVICE_IDS } from "@triverse/shared";
import { PinMark } from "@/components/Logo";
import { Button } from "@/components/ui";
import { AnimatedWordmark, GlobeMark, WelcomeBackdrop } from "@/components/motion/WelcomeHero";
import { useAuth } from "@/lib/auth";
import { appleLogin, googleAvailable, googleLogin, googleWebAvailable, googleWithToken } from "@/lib/social";
import { GoogleWebButton } from "@/components/GoogleWebButton";

export default function Welcome() {
  const { signIn } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [apple, setApple] = useState(false);
  const [busy, setBusy] = useState<"google" | "apple" | null>(null);
  useEffect(() => { if (Platform.OS === "ios") AppleAuthentication.isAvailableAsync().then(setApple); }, []);

  // Scale the hero to the screen so everything fits without overlapping; the page scrolls on very small phones.
  const globe = Math.round(Math.min(250, Math.max(180, height * 0.27)));
  const word = height < 700 ? 38 : 44;
  const tileW = (Math.min(width, 520) - 40 - 10) / 2;

  const social = async (kind: "google" | "apple") => {
    setBusy(kind);
    try {
      const r = kind === "google" ? await googleLogin() : await appleLogin();
      if (r) await signIn(r);
    } catch (e) {
      Alert.alert("Sign-in failed", e instanceof Error ? e.message : "Please try again.");
    } finally { setBusy(null); }
  };

  const withGoogleToken = async (idToken: string) => {
    try { await signIn(await googleWithToken(idToken)); }
    catch (e) { Alert.alert("Sign-in failed", e instanceof Error ? e.message : "Please try again."); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#0E1013" }}>
      <StatusBar style="light" />
      <WelcomeBackdrop />
      <SafeAreaView edges={["top"]} style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false} bounces
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 20, paddingBottom: insets.bottom + 20, gap: 18, maxWidth: 520, width: "100%", alignSelf: "center" }}>
          {/* Hero */}
          <View style={{ alignItems: "center" }}>
            <GlobeMark size={globe} />
            <View style={{ marginTop: -globe * 0.06 }}><AnimatedWordmark size={word} /></View>
          </View>

          {/* The five worlds: a compact two-column grid */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {SERVICE_IDS.map((s, i) => {
              const last = i === SERVICE_IDS.length - 1 && SERVICE_IDS.length % 2 === 1;
              return (
                <Animated.View key={s} entering={FadeInUp.delay(800 + i * 70).springify().damping(16)}
                  style={{ width: last ? "100%" : tileW, flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
                  <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: SERVICES[s].primary }} />
                  <View style={{ width: 36, height: 36, borderRadius: 11, backgroundColor: SERVICES[s].tint, alignItems: "center", justifyContent: "center" }}>
                    <PinMark size={24} active={s} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", fontSize: 14, color: "#FFFFFF" }} numberOfLines={1}>{SERVICES[s].name}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }} numberOfLines={2}>{SERVICES[s].tagline}</Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>

          {/* Pushes the buttons to the bottom on tall screens */}
          <View style={{ flex: 1, minHeight: 4 }} />

          <Animated.View entering={FadeInDown.delay(1150).springify()} style={{ gap: 10 }}>
            {/* Google first: one tap to sign back in, no code to wait for */}
            {googleAvailable && <Button label="Continue with Google" variant="secondary" loading={busy === "google"} onPress={() => social("google")} icon={<GoogleG />} style={{ backgroundColor: "#FFFFFF" }} />}
            {googleWebAvailable && <GoogleWebButton width={Math.min(width, 520) - 40} onToken={(tok) => withGoogleToken(tok)} />}
            <Button label="Continue with phone" onPress={() => router.push({ pathname: "/login", params: { channel: "sms" } })} />
            <Button label="Continue with email" variant="secondary" onPress={() => router.push({ pathname: "/login", params: { channel: "email" } })} />
            {apple && (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
                cornerRadius={999} style={{ height: 52 }} onPress={() => social("apple")} />
            )}
            <Text style={{ textAlign: "center", color: "rgba(255,255,255,0.55)", fontSize: 12, marginTop: 2 }}>
              By continuing you agree to the{" "}
              <Text onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc: "terms" } })} style={{ color: "#FFFFFF", textDecorationLine: "underline" }}>Terms</Text>
              {" "}and{" "}
              <Text onPress={() => router.push({ pathname: "/legal/[doc]", params: { doc: "privacy" } })} style={{ color: "#FFFFFF", textDecorationLine: "underline" }}>Privacy Policy</Text>.
            </Text>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

/** Google's four-colour "G". */
function GoogleG() {
  return (
    <Text style={{ fontSize: 19, fontWeight: "900" }}>
      <Text style={{ color: "#4285F4" }}>G</Text>
    </Text>
  );
}
