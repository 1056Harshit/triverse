import { useEffect } from "react";
import { Platform } from "react-native";
import { usePathname } from "expo-router";
import { SERVICE_IDS, type ServiceId } from "@triverse/shared";
import type { PointerWorld, WorldPointer } from "@triverse/shared/src/worldPointer";
import { useAuth } from "./auth";

const AGENT_WORLD: Record<string, ServiceId> = { farm: "farm", ride: "ride", dine: "dine", health: "health", travel: "travel", promo: "farm" };
let pointer: WorldPointer | null = null;

/** Web only: the mouse becomes a glowing dot with a buddy that matches the world on screen (leaf, car, plate…). */
export function useWorldCursor() {
  const path = usePathname();
  const { user } = useAuth();
  const first = path.split("/").filter(Boolean)[0] ?? "";
  const agent = path.startsWith("/chat/") ? path.split("/")[2] : undefined;
  const world: PointerWorld = !user ? "brand"
    : (SERVICE_IDS as readonly string[]).includes(first) ? (first as ServiceId)
    : agent && AGENT_WORLD[agent] ? AGENT_WORLD[agent]
    : first === "place" ? "dine"
    : first === "legal" || first === "settings" || first === "profile" ? "brand"
    : user.activeService ?? "brand";

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    if (!pointer) {
      const { createWorldPointer } = require("@triverse/shared/src/worldPointer.js") as typeof import("@triverse/shared/src/worldPointer");
      pointer = createWorldPointer({ world });
    }
    pointer.setWorld(world);
  }, [world]);
}
