import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../env.ts";

/**
 * Seat payments use Razorpay manual capture as an escrow:
 *   book    → order created, rider authorises (money blocked, not taken)
 *   pickup  → rider shares the ride PIN, driver enters it
 *   finish  → we capture and settle to the driver (Razorpay Route)
 *   cancel  → we capture only the cancellation fee, or void
 * Authorisations expire after a few days, so rides booked further ahead are
 * authorised 48 hours before departure.
 */
const base = "https://api.razorpay.com/v1";
const auth = () => "Basic " + Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
const enabled = () => !!(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);

async function rp<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(base + path, { method: "POST", headers: { authorization: auth(), "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`Razorpay ${path} ${res.status}: ${await res.text()}`);
  return (await res.json()) as T;
}

export async function createSeatOrder(amountInr: number, receipt: string): Promise<{ orderId: string; keyId?: string }> {
  if (!enabled()) return { orderId: `dev_order_${receipt}` };
  const o = await rp<{ id: string }>("/orders", { amount: amountInr * 100, currency: "INR", receipt, payment: { capture: "manual" } });
  return { orderId: o.id, keyId: env.RAZORPAY_KEY_ID };
}

export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
  if (!enabled()) return orderId.startsWith("dev_order_");
  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET!).update(`${orderId}|${paymentId}`).digest("hex");
  return expected.length === signature.length && timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function capture(paymentId: string, amountInr: number) {
  if (!enabled()) return;
  await rp(`/payments/${paymentId}/capture`, { amount: amountInr * 100, currency: "INR" });
}

/** Cancellation policy: free until 24h before, 25% until 2h, 50% after (goes to the driver). */
export function cancellationFee(amount: number, departAt: Date, now = new Date()): number {
  const hours = (departAt.getTime() - now.getTime()) / 3_600_000;
  if (hours >= 24) return 0;
  if (hours >= 2) return Math.round(amount * 0.25);
  return Math.round(amount * 0.5);
}
