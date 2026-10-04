import { sql } from "drizzle-orm";
import {
  boolean, doublePrecision, index, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";

export const serviceEnum = pgEnum("service", ["farm", "ride", "dine", "health", "travel"]);
export const kycEnum = pgEnum("kyc_status", ["not_started", "pending", "verified", "rejected"]);
export const bookingEnum = pgEnum("booking_status", ["held", "confirmed", "cancelled_by_rider", "cancelled_by_driver", "completed", "disputed"]);

const ts = (n: string) => timestamp(n, { withTimezone: true });

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  email: text("email"),
  emailVerified: boolean("email_verified").default(false).notNull(),
  phone: text("phone"),
  phoneVerified: boolean("phone_verified").default(false).notNull(),
  avatarUrl: text("avatar_url"),
  services: serviceEnum("services").array().default(sql`'{}'`).notNull(),
  activeService: serviceEnum("active_service"),
  roles: text("roles").array().default(sql`'{user}'`).notNull(),
  gender: text("gender"),
  identityKyc: kycEnum("identity_kyc").default("not_started").notNull(),
  driverKyc: kycEnum("driver_kyc").default("not_started").notNull(),
  womenVerified: boolean("women_verified").default(false).notNull(),
  reliability: doublePrecision("reliability").default(100).notNull(),
  welcomeSentFor: serviceEnum("welcome_sent_for").array().default(sql`'{}'`).notNull(),
  /** App preferences (theme, animations, text size, custom banners…); see UserSettings in @triverse/shared. */
  settings: jsonb("settings").$type<Record<string, unknown>>().default({}).notNull(),
  createdAt: ts("created_at").defaultNow().notNull(),
}, (t) => [
  uniqueIndex("users_email_uq").on(t.email),
  uniqueIndex("users_phone_uq").on(t.phone),
]);

export const identities = pgTable("identities", {
  provider: text("provider").notNull(), // google | apple
  subject: text("subject").notNull(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
}, (t) => [primaryKey({ columns: [t.provider, t.subject] })]);

export const otpCodes = pgTable("otp_codes", {
  id: uuid("id").primaryKey().defaultRandom(),
  channel: text("channel").notNull(), // email | sms
  target: text("target").notNull(),
  codeHash: text("code_hash").notNull(),
  attempts: integer("attempts").default(0).notNull(),
  expiresAt: ts("expires_at").notNull(),
  consumedAt: ts("consumed_at"),
  createdAt: ts("created_at").defaultNow().notNull(),
}, (t) => [index("otp_target_idx").on(t.target, t.createdAt)]);

export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: ts("expires_at").notNull(),
  revokedAt: ts("revoked_at"),
});

/** Driver/vehicle documents. Raw document images live in encrypted object storage; only keys are stored. */
export const kycSubmissions = pgTable("kyc_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  kind: text("kind").notNull(), // identity | driver
  dlNumberMasked: text("dl_number_masked"),
  rcNumberMasked: text("rc_number_masked"),
  vehicle: jsonb("vehicle").$type<{ model: string; color: string; fuel: string; insuranceValidTill: string; seats: number }>(),
  checks: jsonb("checks").$type<Array<{ label: string; ok: boolean; note?: string }>>().default([]).notNull(),
  status: kycEnum("status").default("pending").notNull(),
  providerRef: text("provider_ref"),
  documentKeys: text("document_keys").array().default(sql`'{}'`).notNull(),
  /** DPDP: documents are deleted after this date unless the user is still an active driver. */
  retainUntil: ts("retain_until"),
  createdAt: ts("created_at").defaultNow().notNull(),
});

export const rides = pgTable("rides", {
  id: uuid("id").primaryKey().defaultRandom(),
  driverId: uuid("driver_id").references(() => users.id).notNull(),
  originName: text("origin_name").notNull(),
  originLat: doublePrecision("origin_lat").notNull(),
  originLng: doublePrecision("origin_lng").notNull(),
  destName: text("dest_name").notNull(),
  destLat: doublePrecision("dest_lat").notNull(),
  destLng: doublePrecision("dest_lng").notNull(),
  stops: jsonb("stops").$type<Array<{ name: string; lat: number; lng: number }>>().default([]).notNull(),
  polyline: text("polyline"),
  departAt: ts("depart_at").notNull(),
  distanceKm: doublePrecision("distance_km").notNull(),
  tollsInr: integer("tolls_inr").default(0).notNull(),
  seatsTotal: integer("seats_total").notNull(),
  seatsLeft: integer("seats_left").notNull(),
  seatPrice: integer("seat_price").notNull(),
  busEstimate: integer("bus_estimate").notNull(),
  womenOnly: boolean("women_only").default(false).notNull(),
  instantBook: boolean("instant_book").default(true).notNull(),
  rules: jsonb("rules").$type<{ smoking: boolean; pets: boolean; luggage: "small" | "medium" | "large" }>().notNull(),
  status: text("status").default("open").notNull(), // open | full | started | completed | cancelled
  createdAt: ts("created_at").defaultNow().notNull(),
}, (t) => [index("rides_route_idx").on(t.originLat, t.originLng, t.departAt)]);

export const bookings = pgTable("bookings", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull(),
  rideId: uuid("ride_id").references(() => rides.id).notNull(),
  riderId: uuid("rider_id").references(() => users.id).notNull(),
  seats: integer("seats").notNull(),
  amount: integer("amount").notNull(),
  status: bookingEnum("status").default("held").notNull(),
  /** 4-digit PIN the rider tells the driver at pickup; proves the trip started. */
  ridePin: text("ride_pin").notNull(),
  paymentRef: text("payment_ref"),
  pickup: jsonb("pickup").$type<{ name: string; lat: number; lng: number }>(),
  createdAt: ts("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("bookings_code_uq").on(t.code)]);

export const reviews = pgTable("reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  bookingId: uuid("booking_id").references(() => bookings.id).notNull(),
  authorId: uuid("author_id").references(() => users.id).notNull(),
  subjectId: uuid("subject_id").references(() => users.id).notNull(),
  stars: integer("stars").notNull(),
  text: text("text"),
  /** Set only when the trip's GPS trace matched the booked route. */
  tripVerified: boolean("trip_verified").default(false).notNull(),
  createdAt: ts("created_at").defaultNow().notNull(),
}, (t) => [uniqueIndex("reviews_once_uq").on(t.bookingId, t.authorId)]);

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  rideId: uuid("ride_id").references(() => rides.id).notNull(),
  fromId: uuid("from_id").references(() => users.id).notNull(),
  toId: uuid("to_id").references(() => users.id).notNull(),
  body: text("body").notNull(),
  flagged: boolean("flagged").default(false).notNull(),
  createdAt: ts("created_at").defaultNow().notNull(),
});

export const rideAlerts = pgTable("ride_alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  originLat: doublePrecision("origin_lat").notNull(),
  originLng: doublePrecision("origin_lng").notNull(),
  destLat: doublePrecision("dest_lat").notNull(),
  destLng: doublePrecision("dest_lng").notNull(),
  date: text("date").notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  agent: text("agent").notNull(),
  /** Which LLM wrote `history` ("claude" or an OpenAI-compatible provider); formats differ. */
  provider: text("provider").default("claude").notNull(),
  title: text("title"),
  /** Full Claude message history (append-only; never edited). */
  history: jsonb("history").$type<unknown[]>().default([]).notNull(),
  updatedAt: ts("updated_at").defaultNow().notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdBy: uuid("created_by").references(() => users.id).notNull(),
  service: serviceEnum("service").notNull(),
  brief: text("brief").notNull(),
  content: jsonb("content").$type<Record<string, unknown>>().notNull(),
  posterKeys: text("poster_keys").array().default(sql`'{}'`).notNull(),
  status: text("status").default("draft").notNull(),
  createdAt: ts("created_at").defaultNow().notNull(),
});

/** Places a user saved ("♡ Save"). Stores a snapshot so the list renders without re-querying providers. */
export const favorites = pgTable("favorites", {
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  placeId: text("place_id").notNull(),
  name: text("name").notNull(),
  address: text("address"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  triScore: doublePrecision("tri_score"),
  photoUrl: text("photo_url"),
  kind: text("kind"),
  savedAt: ts("saved_at").defaultNow().notNull(),
}, (t) => [primaryKey({ columns: [t.userId, t.placeId] })]);

/** Medicine reminders for the Health world and the daily brief. Times are "HH:MM" in IST. */
export const reminders = pgTable("reminders", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  medicine: text("medicine").notNull(),
  dose: text("dose"),
  times: text("times").array().notNull(),
  withFood: text("with_food"), // before | after | any
  active: boolean("active").default(true).notNull(),
  createdAt: ts("created_at").defaultNow().notNull(),
});
