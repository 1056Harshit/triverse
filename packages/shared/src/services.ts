export type ServiceId = "farm" | "ride" | "dine" | "health" | "travel";
/** The three founding worlds drawn as the dots in the PvtFrnd pin. */
export const CORE_SERVICES = ["farm", "ride", "dine"] as const;

export interface ServiceTheme {
  id: ServiceId;
  name: string;
  tagline: string;
  /** Primary brand colour for this module. */
  primary: string;
  /** Darker shade used for the pin and pressed states. */
  deep: string;
  /** Soft background tint for cards and screens. */
  tint: string;
  /** Agent persona name shown in chat. */
  agentName: string;
}

/**
 * World colours are accents only (icon chips, labels, small markers). They share one softness and
 * brightness so no world shouts louder than another; buttons and surfaces use the brand blue + neutrals.
 */
export const SERVICES: Record<ServiceId, ServiceTheme> = {
  farm: {
    id: "farm",
    name: "Farm",
    tagline: "Diagnose crops, find inputs, grow better",
    primary: "#2F9E68",
    deep: "#1F6B47",
    tint: "#EAF5EF",
    agentName: "Farm Frnd",
  },
  ride: {
    id: "ride",
    name: "Ride",
    tagline: "Share verified rides, split the cost",
    primary: "#3A6FD8",
    deep: "#26489C",
    tint: "#ECF1FC",
    agentName: "Ride Frnd",
  },
  dine: {
    id: "dine",
    name: "Dine & Stay",
    tagline: "The best-rated food and stays near you",
    primary: "#D9693A",
    deep: "#9A4522",
    tint: "#FBEFE9",
    agentName: "Dine Frnd",
  },
  health: {
    id: "health",
    name: "Health",
    tagline: "Hospitals near you, care advice, reminders",
    primary: "#1C9A94",
    deep: "#136B67",
    tint: "#E7F4F3",
    agentName: "Health Frnd",
  },
  travel: {
    id: "travel",
    name: "Travel",
    tagline: "Plan trips, find sights, travel smart",
    primary: "#6E5BD6",
    deep: "#4A3BA0",
    tint: "#EFEDFB",
    agentName: "Travel Frnd",
  },
};

export const SERVICE_IDS = Object.keys(SERVICES) as ServiceId[];

export const BRAND = {
  name: "PvtFrnd",
  tagline: "Your friend for everything",
  navy: "#1E3A8A",
  blue: "#2B5BD7",
  ink: "#0F172A",
  gold: "#F5B700",
  domain: "pvtfrnd.com",
  /** The 3-colour signature gradient. Reserved for the logo ("Frnd") so it stays special. */
  gradient: ["#2F9E68", "#3A6FD8", "#D9693A"],
  gradientDeep: ["#1F6B47", "#26489C", "#9A4522"],
} as const;
