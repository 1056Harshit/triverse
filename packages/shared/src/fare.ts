/**
 * Cost-sharing fare rules for PvtFrnd rides.
 *
 * Private (white-plate) cars in India may not carry passengers for profit, so a
 * driver can only recover their share of running costs. Every price a driver
 * sets is checked against `maxSeatPrice`; the app shows `suggestedSeatPrice`
 * by default and the bus estimate next to it for comparison.
 */

export interface FareInputs {
  distanceKm: number;
  tollsInr: number;
  /** Seats offered to passengers (driver excluded). */
  seats: number;
  /** Litres per 100 km; defaults to a typical hatchback/sedan. */
  fuelLPer100Km?: number;
  fuelPricePerL?: number;
  /** Hill and ghat roads burn more fuel and wear brakes/tyres faster. */
  hillRoute?: boolean;
}

export const FARE_DEFAULTS = {
  fuelLPer100Km: 6.5,
  fuelPricePerL: 96,
  /** Wear and tear per km (tyres, servicing), still cost recovery, not profit. */
  wearPerKm: 1.2,
  hillFactor: 1.2,
  /** Hard ceiling over the computed fair share. */
  capMultiplier: 1.15,
} as const;

/** Approximate per-km fares for Indian state transport classes (2026). */
export const BUS_RATES_PER_KM = {
  ordinary: 1.6,
  semiDeluxe: 2.1,
  acDeluxe: 2.9,
  volvo: 3.6,
} as const;
export type BusClass = keyof typeof BUS_RATES_PER_KM;

export function tripCost(i: FareInputs): number {
  const l100 = i.fuelLPer100Km ?? FARE_DEFAULTS.fuelLPer100Km;
  const price = i.fuelPricePerL ?? FARE_DEFAULTS.fuelPricePerL;
  const fuel = (i.distanceKm / 100) * l100 * price * (i.hillRoute ? FARE_DEFAULTS.hillFactor : 1);
  const wear = i.distanceKm * FARE_DEFAULTS.wearPerKm;
  return fuel + wear + i.tollsInr;
}

/** Fair per-seat share: the trip cost split between driver and passengers. */
export function suggestedSeatPrice(i: FareInputs): number {
  if (i.seats < 1) throw new Error("seats must be at least 1");
  return roundTo5(tripCost(i) / (i.seats + 1));
}

export function maxSeatPrice(i: FareInputs): number {
  return roundTo5((tripCost(i) / (i.seats + 1)) * FARE_DEFAULTS.capMultiplier);
}

export function busFareEstimate(distanceKm: number, cls: BusClass = "volvo"): number {
  // Reservation + toll surcharge typically adds a fixed ~₹30–60.
  return roundTo5(distanceKm * BUS_RATES_PER_KM[cls] + 40);
}

export function validateSeatPrice(i: FareInputs, price: number): { ok: true } | { ok: false; max: number } {
  const max = maxSeatPrice(i);
  return price <= max ? { ok: true } : { ok: false, max };
}

function roundTo5(n: number): number {
  return Math.max(5, Math.round(n / 5) * 5);
}
