import { Image, Pressable, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { ServiceSwitcher } from "@/components/ServiceSwitcher";
import { WorldWarp } from "@/components/motion/WorldWarp";
import { useMotion } from "@/lib/theme";
import { goHome } from "@/lib/nav";
import { GradientBar } from "@/components/BrandGradient";
import { useTheme } from "@/components/ui";
import { useAuth } from "@/lib/auth";

function Avatar() {
  const { user } = useAuth();
  const t = useTheme();
  return (
    <Pressable accessibilityLabel="Profile" onPress={() => router.push("/profile")}>
      {user?.avatarUrl
        ? <Image source={{ uri: user.avatarUrl }} style={{ width: 34, height: 34, borderRadius: 17 }} />
        : <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.primary, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: "#fff", fontWeight: "800" }}>{(user?.name ?? "?")[0]?.toUpperCase()}</Text>
          </View>}
    </Pressable>
  );
}

/** 🏠 Home, "☀️ Your day" brief and profile, top-right on every dashboard. */
function HeaderActions() {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Pressable accessibilityLabel="Home" onPress={() => goHome()} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.tint, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 16 }}>🏠</Text>
      </Pressable>
      <Pressable accessibilityLabel="Your day" onPress={() => router.push("/today")} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.tint, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 17 }}>☀️</Text>
      </Pressable>
      <Avatar />
    </View>
  );
}

export default function AppLayout() {
  const t = useTheme();
  const motion = useMotion();
  const anim = (a: "fade" | "slide_from_right" | "fade_from_bottom" | "slide_from_bottom" | "ios_from_right") => (motion === "off" ? "none" as const : motion === "reduced" ? "fade" as const : a);
  // Dashboards fade (the world warp covers the switch); details slide in; chats and places rise from below.
  const home = { headerTitle: () => <ServiceSwitcher />, headerRight: () => <HeaderActions />, headerTitleAlign: "left" as const, animation: anim("fade"), animationDuration: 260 };
  return (
    <View style={{ flex: 1 }}>
      <Stack screenOptions={{ headerStyle: { backgroundColor: t.bg }, headerShadowVisible: false,
        // A thin 3-colour brand line along the bottom of every header.
        headerBackground: () => <View style={{ flex: 1, backgroundColor: t.bg, justifyContent: "flex-end" }}><GradientBar height={3} style={{ borderRadius: 0, opacity: 0.9 }} /></View>, headerTintColor: t.text, headerBackButtonDisplayMode: "minimal", animation: anim("ios_from_right"), animationDuration: 320 }}>
        <Stack.Screen name="index" options={{ headerShown: false, animation: "none" }} />
        <Stack.Screen name="home" options={{ headerShown: false, animation: anim("fade") }} />
        <Stack.Screen name="farm/index" options={home} />
        <Stack.Screen name="ride/index" options={home} />
        <Stack.Screen name="dine/index" options={home} />
        <Stack.Screen name="health/index" options={home} />
        <Stack.Screen name="travel/index" options={home} />
        <Stack.Screen name="today" options={{ title: "Your day", presentation: "modal", animation: anim("slide_from_bottom") }} />
        <Stack.Screen name="chat/[agent]" options={{ title: "", animation: anim("fade_from_bottom") }} />
        <Stack.Screen name="place/[id]" options={{ headerShown: false, animation: anim("fade_from_bottom") }} />
        <Stack.Screen name="ride/results" options={{ title: "Available rides" }} />
        <Stack.Screen name="ride/[id]" options={{ title: "Ride details" }} />
        <Stack.Screen name="ride/offer" options={{ title: "Offer a ride", animation: anim("slide_from_bottom") }} />
        <Stack.Screen name="ride/verify" options={{ title: "Driver verification" }} />
        <Stack.Screen name="profile" options={{ title: "Profile", presentation: "modal", animation: anim("slide_from_bottom") }} />
        <Stack.Screen name="studio" options={{ title: "Campaign Studio" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
      </Stack>
      <WorldWarp />
    </View>
  );
}
