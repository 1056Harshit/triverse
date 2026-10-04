import { useEffect, useState } from "react";
import * as Location from "expo-location";

export interface Here { lat: number; lng: number; label?: string }

/** Current location with a readable label (city/district). Null until granted. */
export function useHere(): { here: Here | null; denied: boolean } {
  const [here, setHere] = useState<Here | null>(null);
  const [denied, setDenied] = useState(false);
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") { setDenied(true); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [addr] = await Location.reverseGeocodeAsync(pos.coords).catch(() => []);
      setHere({ lat: pos.coords.latitude, lng: pos.coords.longitude, label: addr ? [addr.city ?? addr.subregion, addr.region].filter(Boolean).join(", ") : undefined });
    })().catch(() => setDenied(true));
  }, []);
  return { here, denied };
}
