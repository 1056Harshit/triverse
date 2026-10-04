import { Linking, Pressable, Text, View } from "react-native";
import type { MapPoint } from "./RouteMap";

/** react-native-maps has no web build; link out to Google Maps directions instead. */
export function RouteMap({ points, color, height = 160 }: { points: MapPoint[]; color: string; height?: number }) {
  const url = `https://www.google.com/maps/dir/${points.map((p) => `${p.lat},${p.lng}`).join("/")}`;
  return (
    <Pressable onPress={() => Linking.openURL(url)} style={{ height, backgroundColor: color + "22", alignItems: "center", justifyContent: "center", gap: 6 }}>
      <Text style={{ fontSize: 30 }}>🗺</Text>
      <Text style={{ color, fontWeight: "700" }}>{points.map((p) => p.name).join(" → ")}</Text>
      <Text style={{ color, fontSize: 12 }}>Open route in Google Maps ↗</Text>
    </Pressable>
  );
}
export type { MapPoint };
