import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { PinMark } from "@/components/Logo";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useScheme } from "@/lib/theme";
import { useWorldCursor } from "@/lib/cursor";

SplashScreen.preventAutoHideAsync();

function Gate() {
  const { ready, booted, user } = useAuth();
  useWorldCursor();
  useEffect(() => { if (booted) SplashScreen.hideAsync(); }, [booted]);
  if (!booted) return null;
  if (!ready) return <Connecting />;
  const onboarded = !!user && user.services.length > 0;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!user}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={!!user && !onboarded}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={onboarded}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      <Stack.Screen name="legal/[doc]" options={{ animation: "slide_from_bottom" }} />
    </Stack>
  );
}

/** Shown only on a first open after install while a sleeping server wakes up. */
function Connecting() {
  return (
    <View style={{ flex: 1, backgroundColor: "#060A18", alignItems: "center", justifyContent: "center", gap: 14, padding: 32 }}>
      <PinMark size={64} onDark />
      <ActivityIndicator color="#FFFFFF" />
      <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 16 }}>Connecting to TriVerse…</Text>
      <Text style={{ color: "rgba(255,255,255,0.65)", textAlign: "center", fontSize: 13 }}>The first start can take up to a minute.</Text>
    </View>
  );
}

function ThemedStatusBar() {
  return <StatusBar style={useScheme() === "dark" ? "light" : "dark"} />;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <ThemedStatusBar />
        <Gate />
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
