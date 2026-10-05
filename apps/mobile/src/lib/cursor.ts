import { useEffect } from "react";
import { Platform } from "react-native";
import { usePathname } from "expo-router";
import { cursorStylesheet, SERVICE_IDS, type CursorWorld, type ServiceId } from "@triverse/shared";
import { useAuth } from "./auth";

const AGENT_WORLD: Record<string, ServiceId> = { farm: "farm", ride: "ride", dine: "dine", health: "health", travel: "travel", promo: "farm" };

/** Web only: swaps the mouse cursor to match the world on screen (Farm leaf, Ride car, Dine fork…). */
export function useWorldCursor() {
  const path = usePathname();
  const { user } = useAuth();
  const first = path.split("/").filter(Boolean)[0] ?? "";
  const agent = path.startsWith("/chat/") ? path.split("/")[2] : undefined;
  const world: CursorWorld = !user ? "brand"
    : (SERVICE_IDS as readonly string[]).includes(first) ? (first as ServiceId)
    : agent && AGENT_WORLD[agent] ? AGENT_WORLD[agent]
    : first === "place" ? "dine"
    : user.activeService ?? "brand";

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") return;
    if (!window.matchMedia?.("(pointer: fine)").matches) return; // touch screens have no cursor
    let el = document.getElementById("tv-cursor") as HTMLStyleElement | null;
    if (!el) { el = document.createElement("style"); el.id = "tv-cursor"; document.head.appendChild(el); }
    el.textContent = cursorStylesheet(world);
  }, [world]);
}
