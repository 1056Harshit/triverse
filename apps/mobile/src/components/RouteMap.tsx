import MapView, { Marker, Polyline } from "react-native-maps";
import { Platform } from "react-native";
import Constants from "expo-constants";
import { RouteMap as LinkMap } from "./RouteMap.web";

export interface MapPoint { name: string; lat: number; lng: number }

export function RouteMap({ points, color, height = 220 }: { points: MapPoint[]; color: string; height?: number }) {
  const hasKey = Platform.OS === "ios" || !!Constants.expoConfig?.android?.config?.googleMaps?.apiKey;
  if (!hasKey) return <LinkMap points={points} color={color} height={160} />;
  const lats = points.map((p) => p.lat), lngs = points.map((p) => p.lng);
  return (
    <MapView style={{ height }} initialRegion={{
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2, longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      latitudeDelta: (Math.max(...lats) - Math.min(...lats)) * 1.8 + 0.1, longitudeDelta: (Math.max(...lngs) - Math.min(...lngs)) * 1.8 + 0.1,
    }}>
      {points.map((p, i) => <Marker key={i} coordinate={{ latitude: p.lat, longitude: p.lng }} title={p.name} pinColor={i === 0 ? "green" : i === points.length - 1 ? "red" : "orange"} />)}
      <Polyline coordinates={points.map((p) => ({ latitude: p.lat, longitude: p.lng }))} strokeColor={color} strokeWidth={4} />
    </MapView>
  );
}
