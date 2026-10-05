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

export const SERVICES: Record<ServiceId, ServiceTheme> = {
  farm: {
    id: "farm",
    name: "Farm",
    tagline: "Diagnose crops, find inputs, grow better",
    primary: "#22A35A",
    deep: "#14703D",
    tint: "#E8F6EE",
    agentName: "Farm Frnd",
  },
  ride: {
    id: "ride",
    name: "Ride",
    tagline: "Share verified rides, split the cost",
    primary: "#2F6FEB",
    deep: "#1E4FB8",
    tint: "#E8F0FD",
    agentName: "Ride Frnd",
  },
  dine: {
    id: "dine",
    name: "Dine & Stay",
    tagline: "The best-rated food and stays near you",
    primary: "#F2643D",
    deep: "#B8401E",
    tint: "#FDEDE7",
    agentName: "Dine Frnd",
  },
  health: {
    id: "health",
    name: "Health",
    tagline: "Hospitals near you, care advice, reminders",
    primary: "#0D9488",
    deep: "#0F766E",
    tint: "#E6F6F4",
    agentName: "Health Frnd",
  },
  travel: {
    id: "travel",
    name: "Travel",
    tagline: "Plan trips, find sights, travel smart",
    primary: "#7C3AED",
    deep: "#5B21B6",
    tint: "#F1EBFE",
    agentName: "Travel Frnd",
  },
};

export const SERVICE_IDS = Object.keys(SERVICES) as ServiceId[];

export const BRAND = {
  name: "PvtFrnd",
  tagline: "Your friend for everything",
  navy: "#1E3A8A",
  blue: "#2F6FEB",
  ink: "#0F172A",
  gold: "#F5B700",
  domain: "pvtfrnd.com",
  /** The 3-colour brand gradient (green → blue → orange) for headers, buttons and banners. */
  gradient: ["#22A35A", "#2F6FEB", "#F2643D"],
  /** Deeper version, readable under white text on large areas. */
  gradientDeep: ["#14703D", "#1E4FB8", "#B8401E"],
} as const;
