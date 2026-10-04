import type { ServiceId } from "./services.ts";

export type KycStatus = "not_started" | "pending" | "verified" | "rejected";

export type ThemeMode = "system" | "light" | "dark" | "auto";
export type AccentMode = "dynamic" | "blue" | "purple" | "teal" | "rose" | "amber";
export type MotionLevel = "full" | "reduced" | "off";

/** App preferences, saved on the account so they follow the user across devices. */
export interface UserSettings {
  /** system = follow phone; auto = dark from 7 PM to 6 AM. */
  theme: ThemeMode;
  /** dynamic = each world uses its own colour; otherwise one accent everywhere. */
  accent: AccentMode;
  motion: MotionLevel;
  /** Larger text and buttons for easier reading. */
  largeText: boolean;
  haptics: boolean;
  /** Read assistant answers aloud automatically. */
  autoSpeak: boolean;
  voiceLanguage: "hi" | "pa" | "en";
  /** Custom dashboard banners (photo or animated GIF) per world. */
  banners: Partial<Record<ServiceId, string>>;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system", accent: "dynamic", motion: "full", largeText: false, haptics: true, autoSpeak: false, voiceLanguage: "hi", banners: {},
};

export const ACCENTS: Record<Exclude<AccentMode, "dynamic">, { primary: string; deep: string; tint: string; label: string }> = {
  blue: { primary: "#2F6FEB", deep: "#1E3A8A", tint: "#EEF3FF", label: "Ocean" },
  purple: { primary: "#7C3AED", deep: "#5B21B6", tint: "#F1EBFE", label: "Royal" },
  teal: { primary: "#0D9488", deep: "#0F766E", tint: "#E6F6F4", label: "Mint" },
  rose: { primary: "#E11D48", deep: "#9F1239", tint: "#FFE4EA", label: "Rose" },
  amber: { primary: "#D97706", deep: "#92400E", tint: "#FEF3C7", label: "Sunset" },
};

export interface UserProfile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  services: ServiceId[];
  activeService: ServiceId;
  roles: Array<"user" | "driver" | "admin" | "marketing">;
  kyc: { identity: KycStatus; driver: KycStatus };
  womenVerified: boolean;
  settings: UserSettings;
}

export interface RideStop { name: string; lat: number; lng: number }

export interface RideSummary {
  id: string;
  driver: { id: string; name: string; avatarUrl: string | null; rating: number; trips: number; badges: string[] };
  vehicle: { model: string; color: string; plateMasked: string };
  origin: RideStop;
  destination: RideStop;
  stops: RideStop[];
  departAt: string;
  seatsTotal: number;
  seatsLeft: number;
  seatPrice: number;
  busEstimate: number;
  distanceKm: number;
  womenOnly: boolean;
  instantBook: boolean;
  rules: { smoking: boolean; pets: boolean; luggage: "small" | "medium" | "large" };
}

/** "triverse" is the router assistant that can consult every other agent. */
export type AgentId = ServiceId | "promo" | "triverse";

export interface AgentChatRequest {
  conversationId?: string;
  message: string;
  /** Base64 JPEG/PNG images, e.g. crop photos for the farm agent. */
  images?: Array<{ mediaType: "image/jpeg" | "image/png" | "image/webp"; data: string }>;
  location?: { lat: number; lng: number; label?: string };
  language?: string;
}

/** Server-sent events emitted by POST /agents/:agent/chat. */
export type AgentEvent =
  | { type: "text"; delta: string }
  | { type: "tool"; name: string; status: "start" | "done" }
  | { type: "card"; card: AgentCard }
  | { type: "done"; conversationId: string }
  | { type: "error"; message: string };

export type AgentCard =
  | { kind: "product"; title: string; price: string; seller: string; url: string; registered: boolean }
  | { kind: "diagnosis"; disease: string; confidence: "low" | "medium" | "high"; crop: string }
  | { kind: "ride"; ride: RideSummary }
  | { kind: "place"; name: string; score: number; reviews: number; url: string }
  | { kind: "poster"; url: string; headline: string }
  | { kind: "facility"; facility: Facility }
  | { kind: "plan"; title: string; items: Array<{ label: string; detail: string; cost?: number }>; total?: number };

/** A hospital, clinic, pharmacy, sight or stay, from Google Places or OpenStreetMap. */
export interface Facility {
  id: string;
  name: string;
  category: string;
  address?: string;
  phone?: string;
  website?: string;
  wikipedia?: string;
  photoUrl?: string;
  location: { lat: number; lng: number };
  distanceKm: number;
  open24x7?: boolean;
  ownership?: "government" | "private" | "charity";
  emergency?: boolean;
  rating?: number;
  source: "google" | "osm";
}
