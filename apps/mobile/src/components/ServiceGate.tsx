import { useState, type ReactNode } from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import Animated, { FadeInUp, ZoomIn } from "react-native-reanimated";
import { SERVICES, type ServiceId } from "@triverse/shared";
import { useAuth } from "@/lib/auth";
import { PinMark } from "./Logo";
import { Button, Screen, useTheme } from "./ui";

/** Only services the user picked are open; others show a prompt to add them. */
export function ServiceGate({ service, children }: { service: ServiceId; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || user.services.includes(service)) return <>{children}</>;
  return <NotSelected service={service} />;
}

function NotSelected({ service }: { service: ServiceId }) {
  const t = useTheme();
  const { user, setServices } = useAuth();
  const [busy, setBusy] = useState(false);
  const svc = SERVICES[service];

  const add = async () => {
    if (!user) return;
    setBusy(true);
    try { await setServices([...user.services, service], service); }
    finally { setBusy(false); }
  };
  const back = () => router.replace(`/${user?.services[0] ?? "farm"}`);

  return (
    <Screen>
      <View style={{ alignItems: "center", gap: 14, marginTop: 40 }}>
        <Animated.View entering={ZoomIn.springify()} style={{ width: 120, height: 120, borderRadius: 60, backgroundColor: svc.tint, alignItems: "center", justifyContent: "center" }}>
          <PinMark size={64} active={service} />
          <View style={{ position: "absolute", right: 6, bottom: 6, width: 36, height: 36, borderRadius: 18, backgroundColor: t.danger, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: t.bg }}>
            <Text style={{ color: "#fff", fontSize: 16 }}>🔒</Text>
          </View>
        </Animated.View>
        <Animated.Text entering={FadeInUp.delay(100)} style={{ fontSize: 22, fontWeight: "800", color: t.text, textAlign: "center" }}>
          You haven't selected {svc.name}
        </Animated.Text>
        <Animated.Text entering={FadeInUp.delay(180)} style={{ fontSize: 15, color: t.muted, textAlign: "center", lineHeight: 22 }}>
          {svc.tagline}. Do you want to add {svc.name} to your TriVerse?
        </Animated.Text>
      </View>
      <Animated.View entering={FadeInUp.delay(260)} style={{ gap: 10, marginTop: 10 }}>
        <Button label={`Yes, add ${svc.name}`} onPress={add} loading={busy} style={{ backgroundColor: svc.primary }} />
        <Button label="No, not now" variant="ghost" onPress={back} />
      </Animated.View>
    </Screen>
  );
}
