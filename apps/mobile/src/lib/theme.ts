import { useColorScheme } from "react-native";
import { ACCENTS, BRAND, SERVICES, type ServiceId, type UserSettings } from "@triverse/shared";
import { useAuth } from "./auth";

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;
export const space = (n: number) => n * 4;

const light = {
  // 60% neutral surfaces with no blue cast; 30% ink/slate text; the 10% action colour comes from the accent.
  bg: "#F5F6F7", card: "#FFFFFF", text: "#111827", muted: "#6B7280", subtle: "#9CA3AF", border: "#E5E7EB",
  danger: "#DC2626", success: "#16A34A", warning: "#D97706", overlay: "rgba(15,23,42,0.45)",
};
const dark: typeof light = {
  bg: "#0F1115", card: "#181B21", text: "#E5E7EB", muted: "#9CA3AF", subtle: "#6B7280", border: "#262A31",
  danger: "#F87171", success: "#4ADE80", warning: "#FBBF24", overlay: "rgba(0,0,0,0.6)",
};

export type Palette = typeof light & { primary: string; deep: string; tint: string; onPrimary: string };

/** Light or dark, from the Theme setting (system, light, dark, or auto by time of day). */
export function useScheme(): "light" | "dark" {
  const system = useColorScheme();
  const { settings } = useAuth();
  return resolveScheme(settings.theme, system);
}
export function resolveScheme(mode: UserSettings["theme"], system: string | null | undefined): "light" | "dark" {
  if (mode === "light" || mode === "dark") return mode;
  if (mode === "auto") { const h = new Date().getHours(); return h >= 19 || h < 6 ? "dark" : "light"; }
  return system === "dark" ? "dark" : "light";
}

/** Colours for the current scheme; the accent follows each world ("dynamic") or one colour the user picked. */
export function usePalette(service?: ServiceId | "brand"): Palette {
  const scheme = useScheme();
  const { settings } = useAuth();
  const base = scheme === "dark" ? dark : light;
  const s = settings.accent !== "dynamic" ? ACCENTS[settings.accent]
    : !service || service === "brand" ? ACCENTS.emerald : SERVICES[service];
  return { ...base, primary: s.primary, deep: s.deep, tint: scheme === "dark" ? s.deep + "33" : s.tint, onPrimary: "#FFFFFF" };
}

/** Animation level from Settings. */
export function useMotion(): UserSettings["motion"] {
  return useAuth().settings.motion;
}
export function useTextScale(): number {
  return useAuth().settings.largeText ? 1.2 : 1;
}

export const type = {
  hero: { fontSize: 30, fontWeight: "800" as const, letterSpacing: -0.6 },
  title: { fontSize: 22, fontWeight: "700" as const, letterSpacing: -0.3 },
  h3: { fontSize: 17, fontWeight: "700" as const },
  body: { fontSize: 15, lineHeight: 22 },
  small: { fontSize: 13, lineHeight: 18 },
  tiny: { fontSize: 11, letterSpacing: 1, fontWeight: "700" as const },
};
