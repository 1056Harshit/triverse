import { Image, Pressable, Text, View } from "react-native";
import { router, Stack } from "expo-router";
import { ServiceSwitcher } from "@/components/ServiceSwitcher";
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

/** "☀️ Your day" brief + profile, top-right on every dashboard. */
function HeaderActions() {
  const t = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Pressable accessibilityLabel="Your day" onPress={() => router.push("/today")} style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: t.tint, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 17 }}>☀️</Text>
      </Pressable>
      <Avatar />
    </View>
  );
}

export default function AppLayout() {
  const t = useTheme();
  const home = { headerTitle: () => <ServiceSwitcher />, headerRight: () => <HeaderActions />, headerTitleAlign: "left" as const };
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: t.bg }, headerShadowVisible: false, headerTintColor: t.text, headerBackButtonDisplayMode: "minimal", animation: "ios_from_right", animationDuration: 320 }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="farm/index" options={home} />
      <Stack.Screen name="ride/index" options={home} />
      <Stack.Screen name="dine/index" options={home} />
      <Stack.Screen name="health/index" options={home} />
      <Stack.Screen name="travel/index" options={home} />
      <Stack.Screen name="today" options={{ title: "Your day", presentation: "modal" }} />
      <Stack.Screen name="chat/[agent]" options={{ title: "" }} />
      <Stack.Screen name="place/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="ride/results" options={{ title: "Available rides" }} />
      <Stack.Screen name="ride/[id]" options={{ title: "Ride details" }} />
      <Stack.Screen name="ride/offer" options={{ title: "Offer a ride" }} />
      <Stack.Screen name="ride/verify" options={{ title: "Driver verification" }} />
      <Stack.Screen name="profile" options={{ title: "Profile", presentation: "modal" }} />
      <Stack.Screen name="studio" options={{ title: "Campaign Studio" }} />
      <Stack.Screen name="settings" options={{ title: "Settings" }} />
    </Stack>
  );
}
