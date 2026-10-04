import { Alert, Image, Pressable, Switch, Text, View } from "react-native";
import { router } from "expo-router";
import { pickPhoto } from "@/lib/media";
import { SERVICES, SERVICE_IDS, type ServiceId } from "@triverse/shared";
import { Badge, Button, Card, H, P, Row, Screen, useTheme } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import Animated, { ZoomIn } from "react-native-reanimated";
import { Stagger } from "@/components/motion/Stagger";

const KYC_LABEL = { not_started: ["Not verified", "muted"], pending: ["In review", "warning"], verified: ["Verified ✓", "success"], rejected: ["Action needed", "warning"] } as const;

export default function Profile() {
  const t = useTheme();
  const { user, signOut, setServices, refreshUser } = useAuth();
  if (!user) return null;

  const toggle = async (s: ServiceId, on: boolean) => {
    const next = on ? [...user.services, s] : user.services.filter((x) => x !== s);
    if (!next.length) return Alert.alert("Keep at least one", "TriVerse needs at least one service switched on.");
    await setServices(next, next.includes(user.activeService) ? user.activeService : next[0]);
  };

  const changePhoto = async () => {
    const data = await pickPhoto(false);
    if (data) { await api("/me/avatar", { body: { data } }); await refreshUser(); }
  };

  return (
    <Screen>
      <Animated.View entering={ZoomIn.springify().damping(12)} style={{ alignItems: "center", gap: 8 }}>
        <Pressable onPress={changePhoto}>
          {user.avatarUrl ? <Image source={{ uri: user.avatarUrl }} style={{ width: 96, height: 96, borderRadius: 48 }} />
            : <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: t.tint, alignItems: "center", justifyContent: "center" }}><Text style={{ fontSize: 34 }}>📷</Text></View>}
        </Pressable>
        <H>{user.name ?? "Add your name"}</H>
        <P muted>{[user.phone, user.email].filter(Boolean).join(" · ")}</P>
      </Animated.View>

      <Stagger index={0}>
        <Card onPress={() => router.push("/settings")} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Text style={{ fontSize: 26 }}>⚙️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "800", color: t.text }}>Settings</Text>
            <Text style={{ color: t.muted, fontSize: 12 }}>Theme, colours, animations, banners, text size, voice, account</Text>
          </View>
          <Text style={{ color: t.muted, fontSize: 18 }}>›</Text>
        </Card>
      </Stagger>
      <Stagger index={0}><Card>
        <H level="h3">Verification</H>
        <Row style={{ justifyContent: "space-between" }}><P>Identity (DigiLocker)</P><Badge label={KYC_LABEL[user.kyc.identity][0]} tone={KYC_LABEL[user.kyc.identity][1]} /></Row>
        <Row style={{ justifyContent: "space-between" }}><P>Driver (DL + RC)</P><Badge label={KYC_LABEL[user.kyc.driver][0]} tone={KYC_LABEL[user.kyc.driver][1]} /></Row>
        {user.kyc.driver !== "verified" && <Button label="Become a verified driver" variant="secondary" onPress={() => router.push("/ride/verify")} />}
      </Card></Stagger>

      <Stagger index={1}><Card>
        <H level="h3">My services</H>
        {SERVICE_IDS.map((s) => (
          <Row key={s} style={{ justifyContent: "space-between" }}>
            <View><Text style={{ fontWeight: "700", color: t.text }}>{SERVICES[s].name}</Text><P small muted>{SERVICES[s].tagline}</P></View>
            <Switch value={user.services.includes(s)} onValueChange={(v) => toggle(s, v)} trackColor={{ true: SERVICES[s].primary }} />
          </Row>
        ))}
      </Card></Stagger>

      {(user.roles.includes("marketing") || user.roles.includes("admin")) && <Button label="Open Campaign Studio" variant="secondary" onPress={() => router.push("/studio")} />}
      <Button label="Sign out" variant="ghost" onPress={signOut} />
    </Screen>
  );
}
